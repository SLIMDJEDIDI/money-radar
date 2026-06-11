'use server';

import { prisma } from '../lib/db';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

// ----------------------------------------------------
// 1. PRIVATE USER AUTHENTICATION ACTIONS
// ----------------------------------------------------
export async function loginUser(formData: FormData) {
  try {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    if (!username || !password) {
      return { success: false, error: 'Identifiant et mot de passe requis' };
    }

    const user = await prisma.hubUser.findUnique({
      where: { username: username.toLowerCase().trim() },
    });

    if (!user) {
      return { success: false, error: 'Identifiant incorrect' };
    }

    // Simple robust verification for private deployments (standard text/hash comparison)
    if (user.passwordHash !== password) {
      return { success: false, error: 'Mot de passe incorrect' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        canWrite: user.canWrite,
        canEdit: user.canEdit,
        canDelete: user.canDelete,
      }
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return { success: false, error: 'Erreur d\'authentification' };
  }
}

// ----------------------------------------------------
// 2. PARTNER / CONTACT CRUD ACTIONS
// ----------------------------------------------------
export async function createContact(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const emoji = formData.get('emoji') as string || '👤';
    const country = formData.get('country') as string || '';

    if (!name) {
      return { success: false, error: 'Le nom du partenaire est obligatoire' };
    }

    await prisma.hubContact.create({
      data: {
        name: name.trim(),
        emoji,
        country: country.trim(),
        heldBalanceUsd: 0,
        receivableBalanceUsd: 0,
        payableBalanceUsd: 0,
        netPositionUsd: 0,
      },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Create contact error:', error);
    if (error.code === 'P2002') {
      return { success: false, error: 'Un partenaire avec ce nom existe déjà.' };
    }
    return { success: false, error: 'Échec de la création' };
  }
}

export async function updateContact(formData: FormData) {
  try {
    const contactId = formData.get('contactId') as string;
    const name = formData.get('name') as string;
    const emoji = formData.get('emoji') as string || '👤';
    const country = formData.get('country') as string || '';
    const isArchived = formData.get('isArchived') === 'true';

    if (!contactId || !name) {
      return { success: false, error: 'Nom et ID requis' };
    }

    await prisma.hubContact.update({
      where: { id: contactId },
      data: {
        name: name.trim(),
        emoji,
        country: country.trim(),
        isArchived,
      },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Update contact error:', error);
    return { success: false, error: 'Échec de la modification' };
  }
}

export async function deleteContact(contactId: string) {
  try {
    await prisma.hubContact.delete({
      where: { id: contactId },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Delete contact error:', error);
    return { success: false, error: 'Impossible de supprimer ce partenaire (il possède un historique d\'opérations).' };
  }
}

// ----------------------------------------------------
// 3. TRANSACTION / OPERATION CRUD WITH AUDIT TRAILS
// ----------------------------------------------------
export async function createHubTransaction(formData: FormData) {
  try {
    const contactId = formData.get('contactId') as string;
    const amountStr = formData.get('amount') as string;
    const currencyCode = formData.get('currencyCode') as string || 'USD';
    const type = formData.get('type') as string; // "HELD" | "RECEIVABLE" | "PAYABLE"
    const category = formData.get('category') as string;
    const note = formData.get('note') as string || '';
    const photoFile = formData.get('photo') as File | null;
    const modifiedBy = formData.get('modifiedBy') as string || 'Administrateur';

    if (!contactId || !amountStr || !type || !category) {
      return { success: false, error: 'Champs obligatoires manquants' };
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Montant invalide' };
    }

    // Resolve Exchange rate
    const currency = await prisma.hubCurrency.findUnique({ where: { code: currencyCode } });
    const rate = currency ? currency.rateToUsd : 1.0;
    const amountInUsd = amount * rate;

    // Handle attachment upload
    let photoPath = null;
    let attachmentName = null;
    if (photoFile && photoFile.name && photoFile.size > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      attachmentName = photoFile.name;
      const fileName = `${Date.now()}_${photoFile.name.replace(/\s+/g, '_')}`;
      const filePath = path.join(uploadDir, fileName);
      
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      photoPath = `/uploads/${fileName}`;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create Transaction
      const transaction = await tx.hubTransaction.create({
        data: {
          amount,
          currencyCode,
          amountInUsd,
          contactId,
          type,
          category,
          note,
          photoPath,
          attachmentName,
        },
      });

      // 2. Adjust Contact sheet balances
      const contact = await tx.hubContact.findUnique({ where: { id: contactId } });
      if (contact) {
        let heldBalanceUsd = contact.heldBalanceUsd;
        let receivableBalanceUsd = contact.receivableBalanceUsd;
        let payableBalanceUsd = contact.payableBalanceUsd;

        if (type === 'HELD') heldBalanceUsd += amountInUsd;
        else if (type === 'RECEIVABLE') receivableBalanceUsd += amountInUsd;
        else if (type === 'PAYABLE') payableBalanceUsd += amountInUsd;

        const netPositionUsd = heldBalanceUsd + receivableBalanceUsd - payableBalanceUsd;

        await tx.hubContact.update({
          where: { id: contactId },
          data: {
            heldBalanceUsd,
            receivableBalanceUsd,
            payableBalanceUsd,
            netPositionUsd,
          },
        });
      }

      // 3. Log Audit Trail
      await tx.hubAuditTrail.create({
        data: {
          transactionId: transaction.id,
          fieldName: 'create',
          newValue: `Transaction de ${amount} ${currencyCode} (${category}) créée par ${modifiedBy}`,
          modifiedBy,
        },
      });
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Create transaction error:', error);
    return { success: false, error: 'Échec de l\'opération' };
  }
}

export async function updateHubTransaction(formData: FormData) {
  try {
    const transactionId = formData.get('transactionId') as string;
    const amountStr = formData.get('amount') as string;
    const currencyCode = formData.get('currencyCode') as string || 'USD';
    const type = formData.get('type') as string;
    const category = formData.get('category') as string;
    const note = formData.get('note') as string || '';
    const photoFile = formData.get('photo') as File | null;
    const modifiedBy = formData.get('modifiedBy') as string || 'Administrateur';

    if (!transactionId || !amountStr || !type || !category) {
      return { success: false, error: 'Champs requis manquants' };
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Montant invalide' };
    }

    const currency = await prisma.hubCurrency.findUnique({ where: { code: currencyCode } });
    const rate = currency ? currency.rateToUsd : 1.0;
    const amountInUsd = amount * rate;

    await prisma.$transaction(async (tx) => {
      // 1. Fetch current transaction
      const oldTx = await tx.hubTransaction.findUnique({
        where: { id: transactionId },
        include: { contact: true },
      });

      if (!oldTx) {
        throw new Error('Transaction introuvable');
      }

      // Handle attachment update (if provided)
      let photoPath = oldTx.photoPath;
      let attachmentName = oldTx.attachmentName;
      if (photoFile && photoFile.name && photoFile.size > 0) {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        attachmentName = photoFile.name;
        const fileName = `${Date.now()}_${photoFile.name.replace(/\s+/g, '_')}`;
        const filePath = path.join(uploadDir, fileName);
        
        const buffer = Buffer.from(await photoFile.arrayBuffer());
        fs.writeFileSync(filePath, buffer);
        photoPath = `/uploads/${fileName}`;
      }

      // 2. Revert old transaction USD balances on contact's account
      const oldContact = await tx.hubContact.findUnique({ where: { id: oldTx.contactId } });
      if (oldContact) {
        let hBal = oldContact.heldBalanceUsd;
        let rBal = oldContact.receivableBalanceUsd;
        let pBal = oldContact.payableBalanceUsd;

        if (oldTx.type === 'HELD') hBal -= oldTx.amountInUsd;
        else if (oldTx.type === 'RECEIVABLE') rBal -= oldTx.amountInUsd;
        else if (oldTx.type === 'PAYABLE') pBal -= oldTx.amountInUsd;

        await tx.hubContact.update({
          where: { id: oldTx.contactId },
          data: {
            heldBalanceUsd: hBal,
            receivableBalanceUsd: rBal,
            payableBalanceUsd: pBal,
            netPositionUsd: hBal + rBal - pBal,
          },
        });
      }

      // 3. Apply new transaction USD balances on contact's account
      const newContact = await tx.hubContact.findUnique({ where: { id: oldTx.contactId } });
      if (newContact) {
        let hBal = newContact.heldBalanceUsd;
        let rBal = newContact.receivableBalanceUsd;
        let pBal = newContact.payableBalanceUsd;

        if (type === 'HELD') hBal += amountInUsd;
        else if (type === 'RECEIVABLE') rBal += amountInUsd;
        else if (type === 'PAYABLE') pBal += amountInUsd;

        await tx.hubContact.update({
          where: { id: oldTx.contactId },
          data: {
            heldBalanceUsd: hBal,
            receivableBalanceUsd: rBal,
            payableBalanceUsd: pBal,
            netPositionUsd: hBal + rBal - pBal,
          },
        });
      }

      // 4. Update the Transaction
      await tx.hubTransaction.update({
        where: { id: transactionId },
        data: {
          amount,
          currencyCode,
          amountInUsd,
          type,
          category,
          note,
          photoPath,
          attachmentName,
        },
      });

      // 5. Audit logs for field modifications (Audit Trail)
      if (oldTx.amount !== amount || oldTx.currencyCode !== currencyCode) {
        await tx.hubAuditTrail.create({
          data: {
            transactionId,
            fieldName: 'amount',
            oldValue: `${oldTx.amount} ${oldTx.currencyCode}`,
            newValue: `${amount} ${currencyCode}`,
            modifiedBy,
          },
        });
      }

      if (oldTx.type !== type) {
        await tx.hubAuditTrail.create({
          data: {
            transactionId,
            fieldName: 'type',
            oldValue: oldTx.type,
            newValue: type,
            modifiedBy,
          },
        });
      }

      if (oldTx.category !== category) {
        await tx.hubAuditTrail.create({
          data: {
            transactionId,
            fieldName: 'category',
            oldValue: oldTx.category,
            newValue: category,
            modifiedBy,
          },
        });
      }

      if (oldTx.note !== note) {
        await tx.hubAuditTrail.create({
          data: {
            transactionId,
            fieldName: 'note',
            oldValue: oldTx.note || '',
            newValue: note,
            modifiedBy,
          },
        });
      }
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Update transaction error:', error);
    return { success: false, error: error.message || 'Échec de la modification' };
  }
}

export async function deleteHubTransaction(transactionId: string, modifiedBy: string = 'Administrateur') {
  try {
    await prisma.$transaction(async (tx) => {
      const transaction = await tx.hubTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new Error('Transaction introuvable');
      }

      // 1. Revert transaction balances from Contact sheet
      const contact = await tx.hubContact.findUnique({ where: { id: transaction.contactId } });
      if (contact) {
        let hBal = contact.heldBalanceUsd;
        let rBal = contact.receivableBalanceUsd;
        let pBal = contact.payableBalanceUsd;

        if (transaction.type === 'HELD') hBal -= transaction.amountInUsd;
        else if (transaction.type === 'RECEIVABLE') rBal -= transaction.amountInUsd;
        else if (transaction.type === 'PAYABLE') pBal -= transaction.amountInUsd;

        await tx.hubContact.update({
          where: { id: transaction.contactId },
          data: {
            heldBalanceUsd: hBal,
            receivableBalanceUsd: rBal,
            payableBalanceUsd: pBal,
            netPositionUsd: hBal + rBal - pBal,
          },
        });
      }

      // 2. Log Audit Trail of Deletion BEFORE deleting the transaction (linked via SetNull)
      await tx.hubAuditTrail.create({
        data: {
          transactionId: transaction.id,
          fieldName: 'delete',
          oldValue: `Transaction de ${transaction.amount} ${transaction.currencyCode} (${transaction.category})`,
          newValue: `Supprimée par ${modifiedBy}`,
          modifiedBy,
        },
      });

      // 3. Delete transaction
      await tx.hubTransaction.delete({
        where: { id: transactionId },
      });
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Delete transaction error:', error);
    return { success: false, error: error.message || 'Échec de la suppression' };
  }
}

// ----------------------------------------------------
// 4. REMINDER / RAPPEL ACTION ENDPOINTS
// ----------------------------------------------------
export async function createReminder(formData: FormData) {
  try {
    const contactId = formData.get('contactId') as string;
    const amountStr = formData.get('amount') as string;
    const currencyCode = formData.get('currencyCode') as string || 'USD';
    const dueDateStr = formData.get('dueDate') as string;
    const note = formData.get('note') as string || '';

    if (!contactId || !amountStr || !dueDateStr) {
      return { success: false, error: 'Champs obligatoires requis' };
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Montant invalide' };
    }

    const currency = await prisma.hubCurrency.findUnique({ where: { code: currencyCode } });
    const rate = currency ? currency.rateToUsd : 1.0;
    const amountInUsd = amount * rate;

    await prisma.hubReminder.create({
      data: {
        contactId,
        amount,
        currencyCode,
        amountInUsd,
        dueDate: new Date(dueDateStr),
        note,
      },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Create reminder error:', error);
    return { success: false, error: 'Impossible de créer le rappel' };
  }
}

export async function toggleReminderCompleted(reminderId: string, isCompleted: boolean) {
  try {
    await prisma.hubReminder.update({
      where: { id: reminderId },
      data: { isCompleted },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Toggle reminder error:', error);
    return { success: false, error: 'Échec de l\'opération' };
  }
}

export async function deleteReminder(reminderId: string) {
  try {
    await prisma.hubReminder.delete({
      where: { id: reminderId },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Delete reminder error:', error);
    return { success: false, error: 'Échec de la suppression' };
  }
}

// ----------------------------------------------------
// 5. SETTINGS / CONFIGURATION ACTIONS
// ----------------------------------------------------
export async function updateCurrencyRate(currencyId: string, rateStr: string) {
  try {
    const rateToUsd = parseFloat(rateStr);
    if (isNaN(rateToUsd) || rateToUsd <= 0) {
      return { success: false, error: 'Taux de change invalide' };
    }

    await prisma.hubCurrency.update({
      where: { id: currencyId },
      data: { rateToUsd },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Update rate error:', error);
    return { success: false, error: 'Échec de la modification du taux' };
  }
}

export async function toggleCurrencyActive(currencyId: string, isActive: boolean) {
  try {
    await prisma.hubCurrency.update({
      where: { id: currencyId },
      data: { isActive },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Toggle currency error:', error);
    return { success: false, error: 'Échec' };
  }
}

export async function createCategory(name: string) {
  try {
    if (!name || !name.trim()) return { success: false, error: 'Nom invalide' };

    await prisma.hubCategory.create({
      data: { name: name.trim(), isCustom: true },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Create category error:', error);
    return { success: false, error: 'Cette catégorie existe déjà.' };
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    await prisma.hubCategory.delete({
      where: { id: categoryId },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Delete category error:', error);
    return { success: false, error: 'Échec' };
  }
}

export async function createAssistantUser(formData: FormData) {
  try {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const canEdit = formData.get('canEdit') === 'true';
    const canDelete = formData.get('canDelete') === 'true';

    if (!username || !password) {
      return { success: false, error: 'Identifiant et mot de passe requis' };
    }

    await prisma.hubUser.create({
      data: {
        username: username.toLowerCase().trim(),
        passwordHash: password, // Simple string compare for private usage
        role: 'assistant',
        canWrite: true,
        canEdit,
        canDelete,
      },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Create user error:', error);
    if (error.code === 'P2002') {
      return { success: false, error: 'Cet identifiant est déjà utilisé.' };
    }
    return { success: false, error: 'Échec de l\'opération' };
  }
}

export async function deleteAssistantUser(userId: string) {
  try {
    await prisma.hubUser.delete({
      where: { id: userId },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Delete user error:', error);
    return { success: false, error: 'Impossible de supprimer cet utilisateur' };
  }
}

export async function changeUserPassword(formData: FormData) {
  try {
    const userId = formData.get('userId') as string;
    const newPassword = formData.get('newPassword') as string;

    if (!userId || !newPassword) {
      return { success: false, error: 'Champs requis manquants' };
    }

    await prisma.hubUser.update({
      where: { id: userId },
      data: { passwordHash: newPassword },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Change password error:', error);
    return { success: false, error: 'Échec' };
  }
}

// 6. Master Reset Database to Zero (Money Hub Schema Reset with secure password confirmation)
export async function resetDatabaseToZero(password: string, userId: string) {
  try {
    if (!password || !userId) {
      return { success: false, error: 'Informations de sécurité manquantes.' };
    }

    // Fetch user and verify active password and administrator role
    const user = await prisma.hubUser.findUnique({ where: { id: userId } });
    if (!user || user.passwordHash !== password) {
      return { success: false, error: 'Mot de passe de confirmation incorrect.' };
    }

    if (user.role !== 'admin') {
      return { success: false, error: 'Droits insuffisants. Seul un administrateur peut réinitialiser le système.' };
    }

    await prisma.$transaction(async (tx) => {
      // Clear all active tables
      await tx.hubAuditTrail.deleteMany({});
      await tx.hubReminder.deleteMany({});
      await tx.hubTransaction.deleteMany({});
      await tx.hubContact.deleteMany({});

      // Seed default contacts
      await tx.hubContact.createMany({
        data: [
          { id: 'c1', name: 'Ahmed Chine', emoji: '🇨🇳', country: 'Chine' },
          { id: 'c2', name: 'Jean France', emoji: '🇫🇷', country: 'France' },
          { id: 'c3', name: 'Mohamed Tunisie', emoji: '🇹🇳', country: 'Tunisie' },
          { id: 'c4', name: 'Li Wei', emoji: '🇭🇰', country: 'Hong Kong' }
        ]
      });
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to reset database:', error);
    return { success: false, error: error.message || 'Wipe failed' };
  }
}
