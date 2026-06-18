'use server';

import { prisma } from '../lib/db';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

// --- LOGIQUE D'AUDIT ---
async function logAudit(tx: any, { entityType, entityId, action, details, oldValue, newValue, modifiedBy }: {
  entityType: string,
  entityId?: string,
  action: string,
  details?: string,
  oldValue?: string,
  newValue?: string,
  modifiedBy: string
}) {
  await tx.hubAuditTrail.create({
    data: {
      entityType,
      entityId,
      action,
      details,
      oldValue: oldValue ? String(oldValue) : null,
      newValue: newValue ? String(newValue) : null,
      modifiedBy,
    },
  });
}

// ----------------------------------------------------
// 1. AUTHENTICATION
// ----------------------------------------------------
export async function loginUser(formData: FormData) {
  try {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    const user = await prisma.hubUser.findUnique({
      where: { username: username.toLowerCase().trim() },
    });

    if (!user || user.passwordHash !== password) {
      return { success: false, error: 'Identifiants incorrects' };
    }

    // Log the login activity
    await prisma.hubAuditTrail.create({
      data: {
        entityType: 'USER',
        action: 'LOGIN',
        details: `Connexion réussie de ${user.username}`,
        modifiedBy: user.username,
      }
    });

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
  } catch (error) {
    return { success: false, error: 'Erreur technique' };
  }
}

// ----------------------------------------------------
// 2. CONTACTS
// ----------------------------------------------------
export async function createContact(formData: FormData, modifiedBy: string = 'Admin') {
  try {
    const name = formData.get('name') as string;
    const emoji = formData.get('emoji') as string || '👤';
    const country = formData.get('country') as string || '';

    const res = await prisma.$transaction(async (tx) => {
      const contact = await tx.hubContact.create({
        data: { name: name.trim(), emoji, country: country.trim() },
      });

      await logAudit(tx, {
        entityType: 'CONTACT',
        entityId: contact.id,
        action: 'CREATE',
        details: `Partenaire créé: ${name}`,
        newValue: JSON.stringify(contact),
        modifiedBy,
      });

      return contact;
    });

    revalidatePath('/');
    return { success: true, contact: res };
  } catch (error: any) {
    return { success: false, error: 'Ce nom existe déjà' };
  }
}

export async function updateContact(formData: FormData, modifiedBy: string = 'Admin') {
  try {
    const id = formData.get('contactId') as string;
    const name = formData.get('name') as string;
    const emoji = formData.get('emoji') as string;
    const country = formData.get('country') as string;
    const isArchived = formData.get('isArchived') === 'true';

    await prisma.$transaction(async (tx) => {
      const old = await tx.hubContact.findUnique({ where: { id } });
      const updated = await tx.hubContact.update({
        where: { id },
        data: { name, emoji, country, isArchived },
      });

      await logAudit(tx, {
        entityType: 'CONTACT',
        entityId: id,
        action: 'UPDATE',
        oldValue: JSON.stringify(old),
        newValue: JSON.stringify(updated),
        modifiedBy,
      });
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Erreur modification contact' };
  }
}

export async function deleteContact(id: string, modifiedBy: string = 'Admin') {
  try {
    await prisma.$transaction(async (tx) => {
      const old = await tx.hubContact.findUnique({ where: { id } });
      await tx.hubContact.delete({ where: { id } });

      await logAudit(tx, {
        entityType: 'CONTACT',
        entityId: id,
        action: 'DELETE',
        oldValue: JSON.stringify(old),
        modifiedBy,
      });
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Erreur: ce contact a des transactions' };
  }
}

// ----------------------------------------------------
// 3. TRANSACTIONS
// ----------------------------------------------------
export async function createHubTransaction(formData: FormData, modifiedBy: string = 'Admin') {
  try {
    const contactId = formData.get('contactId') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const currencyCode = formData.get('currencyCode') as string;
    const type = formData.get('type') as string; // HELD, RECEIVABLE, PAYABLE
    const category = formData.get('category') as string;
    const note = formData.get('note') as string;

    const currency = await prisma.hubCurrency.findUnique({ where: { code: currencyCode } });
    const rate = currency ? currency.rateToUsd : 1.0;
    const amountInUsd = amount * rate;

    await prisma.$transaction(async (tx) => {
      const transaction = await tx.hubTransaction.create({
        data: { amount, currencyCode, amountInUsd, contactId, type, category, note },
      });

      // Update Contact Balances
      const contact = await tx.hubContact.findUnique({ where: { id: contactId } });
      if (contact) {
        let h = contact.heldBalanceUsd;
        let r = contact.receivableBalanceUsd;
        let p = contact.payableBalanceUsd;

        if (type === 'HELD') h += amountInUsd;
        else if (type === 'RECEIVABLE') r += amountInUsd;
        else if (type === 'PAYABLE') p += amountInUsd;

        await tx.hubContact.update({
          where: { id: contactId },
          data: { heldBalanceUsd: h, receivableBalanceUsd: r, payableBalanceUsd: p, netPositionUsd: h + r - p },
        });
      }

      await logAudit(tx, {
        entityType: 'TRANSACTION',
        entityId: transaction.id,
        action: 'CREATE',
        details: `${amount} ${currencyCode} pour ${contact?.name}`,
        newValue: JSON.stringify(transaction),
        modifiedBy,
      });
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Erreur transaction' };
  }
}

export async function deleteHubTransaction(id: string, modifiedBy: string = 'Admin') {
  try {
    await prisma.$transaction(async (tx) => {
      const t = await tx.hubTransaction.findUnique({ where: { id }, include: { contact: true } });
      if (!t) return;

      const c = t.contact;
      let h = c.heldBalanceUsd, r = c.receivableBalanceUsd, p = c.payableBalanceUsd;
      if (t.type === 'HELD') h -= t.amountInUsd;
      else if (t.type === 'RECEIVABLE') r -= t.amountInUsd;
      else if (t.type === 'PAYABLE') p -= t.amountInUsd;

      await tx.hubContact.update({
        where: { id: c.id },
        data: { heldBalanceUsd: h, receivableBalanceUsd: r, payableBalanceUsd: p, netPositionUsd: h + r - p },
      });

      await tx.hubTransaction.delete({ where: { id } });

      await logAudit(tx, {
        entityType: 'TRANSACTION',
        entityId: id,
        action: 'DELETE',
        oldValue: JSON.stringify(t),
        modifiedBy,
      });
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Erreur suppression' };
  }
}

// ----------------------------------------------------
// 4. MASTER RESET (CLEAN TEST)
// ----------------------------------------------------
export async function resetDatabaseToZero(password: string, userId: string) {
  try {
    const user = await prisma.hubUser.findUnique({ where: { id: userId } });
    if (!user || user.passwordHash !== password || user.role !== 'admin') {
      return { success: false, error: 'Mot de passe incorrect ou droits insuffisants' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.hubAuditTrail.deleteMany({});
      await tx.hubReminder.deleteMany({});
      await tx.hubTransaction.deleteMany({});
      await tx.hubContact.deleteMany({});
      await tx.hubCurrency.deleteMany({});

      await tx.hubCurrency.createMany({
        data: [
          { code: 'USD', symbol: '$', rateToUsd: 1.0 },
          { code: 'RMB', symbol: '¥', rateToUsd: 0.14 },
          { code: 'EURO', symbol: '€', rateToUsd: 1.08 },
          { code: 'TND', symbol: 'DT', rateToUsd: 0.32 },
        ]
      });

      await tx.hubContact.createMany({
        data: [
          { name: 'Ahmed Chine', emoji: '🇨🇳', country: 'Chine' },
          { name: 'Jean France', emoji: '🇫🇷', country: 'France' },
          { name: 'Mohamed Tunisie', emoji: '🇹🇳', country: 'Tunisie' },
        ]
      });

      await logAudit(tx, {
        entityType: 'SETTING',
        action: 'WIPE',
        details: 'Réinitialisation complète de la base de données',
        modifiedBy: user.username,
      });
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Échec réinitialisation' };
  }
}

// Additional missing wrappers for UI
export async function createReminder(formData: FormData) {
  const cid = formData.get('contactId') as string;
  const amt = parseFloat(formData.get('amount') as string);
  const cur = formData.get('currencyCode') as string;
  const due = new Date(formData.get('dueDate') as string);
  
  const res = await prisma.hubReminder.create({
    data: { contactId: cid, amount: amt, currencyCode: cur, amountInUsd: amt, dueDate: due }
  });
  revalidatePath('/');
  return { success: true };
}

export async function toggleReminderCompleted(id: string, isCompleted: boolean) {
  await prisma.hubReminder.update({ where: { id }, data: { isCompleted } });
  revalidatePath('/');
  return { success: true };
}

export async function deleteReminder(id: string) {
  await prisma.hubReminder.delete({ where: { id } });
  revalidatePath('/');
  return { success: true };
}

export async function updateCurrencyRate(id: string, rate: string) {
  await prisma.hubCurrency.update({ where: { id }, data: { rateToUsd: parseFloat(rate) } });
  revalidatePath('/');
  return { success: true };
}

export async function toggleCurrencyActive(id: string, isActive: boolean) {
  await prisma.hubCurrency.update({ where: { id }, data: { isActive } });
  revalidatePath('/');
  return { success: true };
}

export async function createCategory(name: string) {
  await prisma.hubCategory.create({ data: { name } });
  revalidatePath('/');
  return { success: true };
}

export async function deleteCategory(id: string) {
  await prisma.hubCategory.delete({ where: { id } });
  revalidatePath('/');
  return { success: true };
}

export async function createAssistantUser(formData: FormData) {
  const u = formData.get('username') as string;
  const p = formData.get('password') as string;
  await prisma.hubUser.create({ data: { username: u, passwordHash: p, role: 'assistant' } });
  revalidatePath('/');
  return { success: true };
}

export async function deleteAssistantUser(id: string) {
  await prisma.hubUser.delete({ where: { id } });
  revalidatePath('/');
  return { success: true };
}

export async function changeUserPassword(formData: FormData) {
  const uid = formData.get('userId') as string;
  const np = formData.get('newPassword') as string;
  await prisma.hubUser.update({ where: { id: uid }, data: { passwordHash: np } });
  revalidatePath('/');
  return { success: true };
}
