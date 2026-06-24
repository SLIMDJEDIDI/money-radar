'use server';

import { prisma } from '../lib/db';
import { revalidatePath } from 'next/cache';
import {
  verifyPassword, hashPassword, needsUpgrade,
  setSessionCookie, clearSessionCookie, requireSession, requireAdmin,
} from '../lib/auth';

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
    const username = (formData.get('username') as string || '').toLowerCase().trim();
    const password = formData.get('password') as string || '';

    const user = await prisma.hubUser.findUnique({ where: { username } });

    // Constant-ish failure to avoid leaking which field is wrong
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return { success: false, error: 'Identifiants incorrects' };
    }

    // Auto-upgrade legacy plaintext passwords to scrypt on successful login
    if (needsUpgrade(user.passwordHash)) {
      await prisma.hubUser.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(password) },
      });
    }

    // Establish signed, httpOnly session cookie (server-side trust)
    await setSessionCookie({ id: user.id, username: user.username, role: user.role });

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
  } catch {
    return { success: false, error: 'Erreur technique' };
  }
}

export async function logoutUser() {
  try {
    const session = await requireSession();
    await prisma.hubAuditTrail.create({
      data: {
        entityType: 'USER',
        action: 'LOGOUT',
        details: `Déconnexion de ${session.username}`,
        modifiedBy: session.username,
      }
    });
  } catch {
    // ignore — clearing cookie regardless
  }
  await clearSessionCookie();
  return { success: true };
}

export async function getCurrentUser() {
  try {
    const session = await requireSession();
    const user = await prisma.hubUser.findUnique({ where: { id: session.id } });
    if (!user) return null;
    return {
      id: user.id, username: user.username, role: user.role,
      canWrite: user.canWrite, canEdit: user.canEdit, canDelete: user.canDelete,
    };
  } catch {
    return null;
  }
}

// ----------------------------------------------------
// 2. CONTACTS
// ----------------------------------------------------
export async function createContact(formData: FormData) {
  try {
    const session = await requireSession();
    const modifiedBy = session.username;
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
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') {
      return { success: false, error: 'Session expirée. Veuillez vous reconnecter.', code: error.message };
    }
    if (error?.code === 'P2002') {
      return { success: false, error: 'Ce nom existe déjà' };
    }
    return { success: false, error: 'Erreur lors de la création du partenaire' };
  }
}

export async function updateContact(formData: FormData) {
  try {
    const session = await requireSession();
    const modifiedBy = session.username;
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
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') {
      return { success: false, error: 'Session expirée. Veuillez vous reconnecter.', code: error.message };
    }
    return { success: false, error: 'Erreur modification contact' };
  }
}

export async function deleteContact(id: string) {
  try {
    const session = await requireSession();
    const modifiedBy = session.username;
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
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') {
      return { success: false, error: 'Session expirée. Veuillez vous reconnecter.', code: error.message };
    }
    return { success: false, error: 'Erreur: ce contact a des transactions' };
  }
}

// ----------------------------------------------------
// 3. TRANSACTIONS
// ----------------------------------------------------
export async function createHubTransaction(formData: FormData) {
  try {
    const session = await requireSession();
    const modifiedBy = session.username;
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
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') {
      return { success: false, error: 'Session expirée. Veuillez vous reconnecter.', code: error.message };
    }
    return { success: false, error: 'Erreur transaction' };
  }
}

export async function deleteHubTransaction(id: string) {
  try {
    const session = await requireSession();
    const modifiedBy = session.username;
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
export async function resetDatabaseToZero(password: string) {
  try {
    // Server-side admin enforcement — never trust a client-supplied userId
    const session = await requireAdmin();
    const user = await prisma.hubUser.findUnique({ where: { id: session.id } });
    if (!user || !verifyPassword(password, user.passwordHash) || user.role !== 'admin') {
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

// Additional missing wrappers for UI — all guarded by session
export async function createReminder(formData: FormData) {
  const session = await requireSession();
  const cid = formData.get('contactId') as string;
  const amt = parseFloat(formData.get('amount') as string);
  const cur = formData.get('currencyCode') as string;
  const due = new Date(formData.get('dueDate') as string);
  const note = formData.get('note') as string || '';

  // Proper USD conversion using the currency rate
  const currency = await prisma.hubCurrency.findUnique({ where: { code: cur } });
  const rate = currency ? currency.rateToUsd : 1.0;
  const amountInUsd = amt * rate;

  await prisma.$transaction(async (tx) => {
    const reminder = await tx.hubReminder.create({
      data: { contactId: cid, amount: amt, currencyCode: cur, amountInUsd, dueDate: due, note }
    });
    const contact = await tx.hubContact.findUnique({ where: { id: cid } });
    await logAudit(tx, {
      entityType: 'REMINDER', entityId: reminder.id, action: 'CREATE',
      details: `Paiement attendu: ${amt} ${cur} de ${contact?.name} le ${due.toLocaleDateString('fr-FR')}`,
      modifiedBy: session.username,
    });
  });
  revalidatePath('/');
  return { success: true };
}

export async function toggleReminderCompleted(id: string, isCompleted: boolean) {
  await requireSession();
  await prisma.hubReminder.update({ where: { id }, data: { isCompleted } });
  revalidatePath('/');
  return { success: true };
}

// Confirm a payment was received -> move it into the partner's AVOIR (HELD) balance
export async function confirmReminderReceived(id: string) {
  try {
    const session = await requireSession();
    await prisma.$transaction(async (tx) => {
      const reminder = await tx.hubReminder.findUnique({ where: { id }, include: { contact: true } });
      if (!reminder) throw new Error('NOT_FOUND');
      if (reminder.isCompleted) return;

      // Create the AVOIR (HELD) transaction in the original currency
      await tx.hubTransaction.create({
        data: {
          amount: reminder.amount,
          currencyCode: reminder.currencyCode,
          amountInUsd: reminder.amountInUsd,
          contactId: reminder.contactId,
          type: 'HELD',
          category: 'Paiement reçu',
          note: `Encaissement du rappel du ${new Date(reminder.dueDate).toLocaleDateString('fr-FR')}`,
        },
      });

      // Update partner balances (held += amount)
      const c = reminder.contact;
      const h = c.heldBalanceUsd + reminder.amountInUsd;
      await tx.hubContact.update({
        where: { id: c.id },
        data: { heldBalanceUsd: h, netPositionUsd: h + c.receivableBalanceUsd - c.payableBalanceUsd },
      });

      // Mark reminder completed
      await tx.hubReminder.update({ where: { id }, data: { isCompleted: true } });

      await logAudit(tx, {
        entityType: 'REMINDER', entityId: id, action: 'RECEIVED',
        details: `Paiement reçu de ${c.name}: ${reminder.amount} ${reminder.currencyCode} ajouté aux Avoirs`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') {
      return { success: false, error: 'Session expirée. Veuillez vous reconnecter.', code: error.message };
    }
    return { success: false, error: 'Erreur lors de la confirmation' };
  }
}

// Postpone a reminder to a new follow-up date
export async function postponeReminder(id: string, newDate: string) {
  try {
    const session = await requireSession();
    const due = new Date(newDate);
    await prisma.$transaction(async (tx) => {
      const reminder = await tx.hubReminder.findUnique({ where: { id }, include: { contact: true } });
      if (!reminder) throw new Error('NOT_FOUND');
      await tx.hubReminder.update({ where: { id }, data: { dueDate: due, isCompleted: false } });
      await logAudit(tx, {
        entityType: 'REMINDER', entityId: id, action: 'POSTPONED',
        details: `Rappel ${reminder.contact?.name} reporté au ${due.toLocaleDateString('fr-FR')}`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') {
      return { success: false, error: 'Session expirée. Veuillez vous reconnecter.', code: error.message };
    }
    return { success: false, error: 'Erreur lors du report' };
  }
}

export async function deleteReminder(id: string) {
  await requireSession();
  await prisma.hubReminder.delete({ where: { id } });
  revalidatePath('/');
  return { success: true };
}

export async function updateCurrencyRate(id: string, rate: string) {
  await requireAdmin();
  await prisma.hubCurrency.update({ where: { id }, data: { rateToUsd: parseFloat(rate) } });
  revalidatePath('/');
  return { success: true };
}

export async function toggleCurrencyActive(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.hubCurrency.update({ where: { id }, data: { isActive } });
  revalidatePath('/');
  return { success: true };
}

export async function createCategory(name: string) {
  await requireSession();
  await prisma.hubCategory.create({ data: { name } });
  revalidatePath('/');
  return { success: true };
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  await prisma.hubCategory.delete({ where: { id } });
  revalidatePath('/');
  return { success: true };
}

export async function createAssistantUser(formData: FormData) {
  await requireAdmin();
  const u = (formData.get('username') as string || '').toLowerCase().trim();
  const p = formData.get('password') as string || '';
  await prisma.hubUser.create({ data: { username: u, passwordHash: hashPassword(p), role: 'assistant' } });
  revalidatePath('/');
  return { success: true };
}

export async function deleteAssistantUser(id: string) {
  await requireAdmin();
  await prisma.hubUser.delete({ where: { id } });
  revalidatePath('/');
  return { success: true };
}

export async function changeUserPassword(formData: FormData) {
  const session = await requireSession();
  const uid = formData.get('userId') as string;
  const np = formData.get('newPassword') as string || '';
  // Non-admins may only change their OWN password
  if (session.role !== 'admin' && session.id !== uid) {
    return { success: false, error: 'Action non autorisée' };
  }
  await prisma.hubUser.update({ where: { id: uid }, data: { passwordHash: hashPassword(np) } });
  revalidatePath('/');
  return { success: true };
}
