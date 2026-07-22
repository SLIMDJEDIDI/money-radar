'use server';

import { prisma } from '../lib/db';
import { revalidatePath } from 'next/cache';
import {
  verifyPassword, hashPassword, needsUpgrade,
  setSessionCookie, clearSessionCookie, requireSession, requireAdmin, getSession, getPanicLockState,
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

    const panic = await getPanicLockState();

    // Panic Lock: every regular account is blocked; only the temporary emergency identity may authenticate.
    if (panic.isLocked) {
      if (username !== panic.emergencyUsername || !panic.emergencyUsername) {
        return { success: false, error: 'PLATEFORME VERROUILLÉE — utilisez les identifiants d’urgence' };
      }
      // Read the emergency hash from the singleton record (not HubUser).
      const lock = await prisma.hubPanicLock.findUnique({ where: { id: 'global' } });
      if (!lock?.emergencyPasswordHash || !verifyPassword(password, lock.emergencyPasswordHash)) {
        return { success: false, error: 'Identifiants d’urgence incorrects' };
      }
      await setSessionCookie({ id: 'panic-emergency', username: panic.emergencyUsername, role: 'emergency', epoch: panic.lockEpoch });
      await prisma.hubAuditTrail.create({ data: { entityType: 'SECURITY', action: 'PANIC_EMERGENCY_LOGIN', details: 'Connexion via identifiant d’urgence', modifiedBy: panic.emergencyUsername } });
      return { success: true, panicLocked: true, user: { id: 'panic-emergency', username: panic.emergencyUsername, role: 'emergency', canWrite: false, canEdit: false, canDelete: false } };
    }

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
    await setSessionCookie({ id: user.id, username: user.username, role: user.role, epoch: panic.lockEpoch });

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
  const session = await getSession();
  if (!session) return { authenticated: false as const };

  try {
    const panic = await getPanicLockState();
    // Emergency sessions never resolve to a HubUser and have zero permissions.
    if (session.role === 'emergency') {
      return {
        authenticated: true as const,
        panicLocked: true as const,
        user: { id: session.id, username: session.username, role: 'emergency', canWrite: false, canEdit: false, canDelete: false },
      };
    }

    const user = await prisma.hubUser.findUnique({ where: { id: session.id } });
    if (!user) return { authenticated: false as const };

    // Sliding session stays on the current global epoch.
    await setSessionCookie({ id: user.id, username: user.username, role: user.role, epoch: panic.lockEpoch });
    return {
      authenticated: true as const,
      user: { id: user.id, username: user.username, role: user.role, canWrite: user.canWrite, canEdit: user.canEdit, canDelete: user.canDelete },
    };
  } catch {
    // Security-first: an auth/state lookup failure logs the client out rather than trusting stale access.
    await clearSessionCookie();
    return { authenticated: false as const };
  }
}

// ---------------- PANIC LOCK (owner/admin only) ----------------
export async function activatePanicLock(formData: FormData) {
  try {
    const session = await requireAdmin();
    const currentPassword = formData.get('currentPassword') as string || '';
    const emergencyUsername = (formData.get('emergencyUsername') as string || '').toLowerCase().trim();
    const emergencyPassword = formData.get('emergencyPassword') as string || '';
    const emergencyPasswordConfirm = formData.get('emergencyPasswordConfirm') as string || '';

    if (!/^[a-z0-9._-]{3,32}$/.test(emergencyUsername)) return { success: false, error: 'Identifiant urgence invalide (3–32: lettres, chiffres, . _ -)' };
    if (emergencyPassword.length < 12) return { success: false, error: 'Mot de passe urgence trop court (minimum 12 caractères)' };
    if (emergencyPassword !== emergencyPasswordConfirm) return { success: false, error: 'Les mots de passe urgence ne correspondent pas' };

    const actor = await prisma.hubUser.findUnique({ where: { id: session.id } });
    if (!actor || !verifyPassword(currentPassword, actor.passwordHash)) return { success: false, error: 'Mot de passe actuel incorrect' };
    // Prevent an emergency username from colliding with a regular account.
    const collision = await prisma.hubUser.findUnique({ where: { username: emergencyUsername } });
    if (collision) return { success: false, error: 'Cet identifiant d’urgence correspond déjà à un utilisateur existant' };

    await prisma.$transaction(async (tx) => {
      const previous = await tx.hubPanicLock.findUnique({ where: { id: 'global' } });
      if (previous?.isLocked) throw new Error('ALREADY_LOCKED');
      const nextEpoch = (previous?.lockEpoch ?? 0) + 1;
      await tx.hubPanicLock.upsert({
        where: { id: 'global' },
        create: { id: 'global', isLocked: true, emergencyUsername, emergencyPasswordHash: hashPassword(emergencyPassword), lockedAt: new Date(), lockedBy: actor.username, lockEpoch: nextEpoch },
        update: { isLocked: true, emergencyUsername, emergencyPasswordHash: hashPassword(emergencyPassword), lockedAt: new Date(), lockedBy: actor.username, lockEpoch: nextEpoch },
      });
      await logAudit(tx, { entityType: 'SECURITY', action: 'PANIC_LOCK_ACTIVATED', details: `Panic Lock activé. Tous les accès réguliers ont été invalidés.`, modifiedBy: actor.username });
    });
    // Current caller's cookie is now stale because the epoch changed.
    await clearSessionCookie();
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'ALREADY_LOCKED') return { success: false, error: 'Panic Lock déjà actif' };
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Session administrateur requise' };
    return { success: false, error: 'Impossible d’activer Panic Lock' };
  }
}

// The emergency account can only unlock. It has no access to operational actions or data.
export async function unlockPanicLock(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'emergency') return { success: false, error: 'Session d’urgence requise' };
    const password = formData.get('emergencyPassword') as string || '';
    const lock = await prisma.hubPanicLock.findUnique({ where: { id: 'global' } });
    if (!lock?.isLocked || !lock.emergencyPasswordHash || !verifyPassword(password, lock.emergencyPasswordHash)) {
      return { success: false, error: 'Mot de passe d’urgence incorrect' };
    }

    await prisma.$transaction(async (tx) => {
      const current = await tx.hubPanicLock.findUnique({ where: { id: 'global' } });
      if (!current?.isLocked) throw new Error('NOT_LOCKED');
      await tx.hubPanicLock.update({
        where: { id: 'global' },
        data: { isLocked: false, emergencyUsername: null, emergencyPasswordHash: null, lockedAt: null, lockedBy: null, lockEpoch: current.lockEpoch + 1 },
      });
      await logAudit(tx, { entityType: 'SECURITY', action: 'PANIC_LOCK_RELEASED', details: 'Panic Lock désactivé via identifiants d’urgence. Tous les anciens cookies restent invalides.', modifiedBy: session.username });
    });
    await clearSessionCookie();
    revalidatePath('/');
    return { success: true };
  } catch {
    return { success: false, error: 'Impossible de désactiver Panic Lock' };
  }
}

// ----------------------------------------------------
// 2. CONTACTS
// ----------------------------------------------------
export async function createContact(formData: FormData) {
  try {
    const session = await requireAdmin();
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
    const session = await requireAdmin();
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
    const session = await requireAdmin();
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
    const session = await requireAdmin();
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

// Settle (pay down) a partner's DEBT using their available AVOIR (held) balance.
// Moves min(held, payable) from held -> reduces payable. Records an audit entry.
export async function settleDebtFromAvoir(contactId: string) {
  try {
    const session = await requireAdmin();
    let settledUsd = 0;
    await prisma.$transaction(async (tx) => {
      const contact = await tx.hubContact.findUnique({ where: { id: contactId } });
      if (!contact) throw new Error('NOT_FOUND');

      const held = contact.heldBalanceUsd;
      const payable = contact.payableBalanceUsd;
      settledUsd = Math.min(held, payable);
      if (settledUsd <= 0.01) return; // nothing to settle

      const h = held - settledUsd;
      const p = payable - settledUsd;

      await tx.hubContact.update({
        where: { id: contactId },
        data: { heldBalanceUsd: h, payableBalanceUsd: p, netPositionUsd: h + contact.receivableBalanceUsd - p },
      });

      // Record a settlement transaction for traceability (USD)
      await tx.hubTransaction.create({
        data: {
          amount: settledUsd, currencyCode: 'USD', amountInUsd: settledUsd,
          contactId, type: 'PAYABLE', category: 'Règlement dette',
          note: `Dette réglée automatiquement depuis l'Avoir (${settledUsd.toFixed(2)} $)`,
        },
      });

      await logAudit(tx, {
        entityType: 'CONTACT', entityId: contactId, action: 'SETTLE_DEBT',
        details: `Dette de ${contact.name} réglée via Avoir: ${settledUsd.toFixed(2)} $`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true, settledUsd };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') {
      return { success: false, error: 'Session expirée. Veuillez vous reconnecter.', code: error.message };
    }
    return { success: false, error: 'Erreur lors du règlement de la dette' };
  }
}

// ----------------------------------------------------
// 5. TND TREASURY
// ----------------------------------------------------
export async function createTndMovement(formData: FormData) {
  try {
    const session = await requireSession();
    const amount = parseFloat(formData.get('amount') as string);
    const type = formData.get('type') as string; // "IN" or "OUT"
    const note = (formData.get('note') as string || '').trim();
    const scheduledForRaw = (formData.get('scheduledFor') as string || '').trim();

    if (!note) return { success: false, error: 'La note est obligatoire pour la traçabilité' };
    if (!isFinite(amount) || amount <= 0) return { success: false, error: 'Montant invalide' };

    // Parse scheduled date if provided; a future date makes the movement UNSETTLED (pending).
    let scheduledFor: Date | null = null;
    let isSettled = true;
    if (scheduledForRaw) {
      const d = new Date(scheduledForRaw);
      if (isNaN(d.getTime())) return { success: false, error: 'Date planifiée invalide' };
      // Only future dates create a pending movement; past/today dates settle immediately
      const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
      if (d.getTime() > startOfToday.getTime()) {
        scheduledFor = d;
        isSettled = false;
      }
    }

    await prisma.$transaction(async (tx) => {
      const movement = await tx.hubTndMovement.create({
        data: { amount, type, note, performedBy: session.username, scheduledFor, isSettled },
      });

      await logAudit(tx, {
        entityType: 'TREASURY',
        entityId: movement.id,
        action: !isSettled ? (type === 'IN' ? 'TND_IN_SCHEDULED' : 'TND_OUT_SCHEDULED') : (type === 'IN' ? 'TND_IN' : 'TND_OUT'),
        details: !isSettled
          ? `${type === 'IN' ? 'Entrée' : 'Sortie'} PLANIFIÉE ${amount} TND pour ${scheduledFor!.toLocaleDateString('fr-FR')}: ${note}`
          : `${type === 'IN' ? 'Entrée' : 'Sortie'} de ${amount} TND: ${note}`,
        modifiedBy: session.username,
      });
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') {
      return { success: false, error: 'Session expirée', code: error.message };
    }
    return { success: false, error: 'Erreur lors de l\'enregistrement' };
  }
}

// Batch disbursement: all rows validate before one atomic transaction writes them.
export async function createTndBatchDisbursement(formData: FormData) {
  try {
    const session = await requireSession();
    const raw = formData.get('items') as string || '';
    const scheduledForRaw = (formData.get('scheduledFor') as string || '').trim();
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return { success: false, error: 'Liste de décaissements invalide' }; }
    if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 30) return { success: false, error: 'Ajoutez entre 1 et 30 décaissements' };

    const items = parsed.map((row: any, index: number) => ({
      amount: Number(row?.amount),
      note: String(row?.note || '').trim(),
      index: index + 1,
    }));
    const invalid = items.find(item => !isFinite(item.amount) || item.amount <= 0 || !item.note);
    if (invalid) return { success: false, error: `Ligne ${invalid.index} : montant positif et note obligatoire requis` };

    let scheduledFor: Date | null = null;
    let isSettled = true;
    if (scheduledForRaw) {
      const date = new Date(scheduledForRaw);
      if (isNaN(date.getTime())) return { success: false, error: 'Date planifiée invalide' };
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      if (date.getTime() > startOfToday.getTime()) { scheduledFor = date; isSettled = false; }
    }

    const total = items.reduce((sum, item) => sum + item.amount, 0);
    await prisma.$transaction(async (tx) => {
      const created = await Promise.all(items.map(item => tx.hubTndMovement.create({
        data: { amount: item.amount, type: 'OUT', note: item.note, performedBy: session.username, scheduledFor, isSettled },
      })));
      await logAudit(tx, {
        entityType: 'TREASURY',
        entityId: created[0]?.id,
        action: isSettled ? 'TND_BATCH_OUT' : 'TND_BATCH_OUT_SCHEDULED',
        details: `${items.length} décaissements ${isSettled ? 'enregistrés' : 'planifiés'} — total ${total} TND${scheduledFor ? ` pour ${scheduledFor.toLocaleDateString('fr-FR')}` : ''}`,
        newValue: JSON.stringify(items.map(({ amount, note }) => ({ amount, note }))),
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true, count: items.length, total };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN' || error?.message === 'PANIC_LOCKED') return { success: false, error: error.message === 'PANIC_LOCKED' ? 'Panic Lock actif' : 'Session expirée', code: error.message };
    return { success: false, error: 'Erreur lors de l’enregistrement groupé' };
  }
}

export async function settleTndMovement(id: string) {
  try {
    const session = await requireSession();
    await prisma.$transaction(async (tx) => {
      const m = await tx.hubTndMovement.findUnique({ where: { id } });
      if (!m) return;
      if (m.isSettled) return;
      await tx.hubTndMovement.update({ where: { id }, data: { isSettled: true } });
      await logAudit(tx, {
        entityType: 'TREASURY',
        entityId: id,
        action: 'TND_SETTLE',
        details: `Mouvement TND confirmé encaissé (${m.amount} ${m.type})`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'Action non autorisée' };
  }
}

// The amount, movement direction, schedule and settlement state are deliberately not accepted here.
// This preserves the financial record while allowing a corrected explanatory note.
export async function updateTndMovementNote(id: string, rawNote: string) {
  try {
    const session = await requireSession();
    const note = String(rawNote || '').trim();
    if (!id || !note) return { success: false, error: 'La note est obligatoire' };
    if (note.length > 1000) return { success: false, error: 'La note ne peut pas dépasser 1 000 caractères' };

    await prisma.$transaction(async (tx) => {
      const movement = await tx.hubTndMovement.findUnique({ where: { id } });
      if (!movement) throw new Error('NOT_FOUND');
      if (movement.note === note) return;

      // NOTE ONLY: no financial field is ever mutated in this action.
      await tx.hubTndMovement.update({ where: { id }, data: { note } });
      await logAudit(tx, {
        entityType: 'TREASURY',
        entityId: id,
        action: 'TND_NOTE_EDIT',
        details: `Note modifiée — ${movement.type === 'IN' ? 'Entrée' : 'Sortie'} ${movement.amount} TND : « ${movement.note} » → « ${note} »`,
        oldValue: movement.note,
        newValue: note,
        modifiedBy: session.username,
      });
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN' || error?.message === 'PANIC_LOCKED') return { success: false, error: error.message === 'PANIC_LOCKED' ? 'Panic Lock actif' : 'Session expirée', code: error.message };
    if (error?.message === 'NOT_FOUND') return { success: false, error: 'Mouvement introuvable' };
    return { success: false, error: 'Modification de la note impossible' };
  }
}

export async function deleteTndMovement(id: string) {
  try {
    const session = await requireAdmin();
    await prisma.$transaction(async (tx) => {
      const old = await tx.hubTndMovement.findUnique({ where: { id } });
      if (!old) return;
      await tx.hubTndMovement.delete({ where: { id } });
      await logAudit(tx, {
        entityType: 'TREASURY',
        entityId: id,
        action: 'TND_DELETE',
        oldValue: JSON.stringify(old),
        details: `Suppression mouvement TND: ${old.amount} (${old.type})`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'Action non autorisée' };
  }
}

export async function deleteHubTransaction(id: string) {
  try {
    const session = await requireAdmin();
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
    const session = await requireAdmin();
  const cid = formData.get('contactId') as string;
  const amt = parseFloat(formData.get('amount') as string);
  const cur = formData.get('currencyCode') as string;
  const due = new Date(formData.get('dueDate') as string);
  const note = formData.get('note') as string || '';
  const reminderEmail = formData.get('reminderEmail') as string || '';

  // Proper USD conversion using the currency rate
  const currency = await prisma.hubCurrency.findUnique({ where: { code: cur } });
  const rate = currency ? currency.rateToUsd : 1.0;
  const amountInUsd = amt * rate;

  await prisma.$transaction(async (tx) => {
    const reminder = await tx.hubReminder.create({
      data: { contactId: cid, amount: amt, currencyCode: cur, amountInUsd, dueDate: due, note, reminderEmail }
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
    await requireAdmin();
  await prisma.hubReminder.update({ where: { id }, data: { isCompleted } });
  revalidatePath('/');
  return { success: true };
}

// Confirm a payment was received -> move it into the partner's AVOIR (HELD) balance
export async function confirmReminderReceived(id: string) {
  try {
    const session = await requireAdmin();
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
    const session = await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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
  try {
    const session = await requireAdmin();
    const u = (formData.get('username') as string || '').toLowerCase().trim();
    const p = formData.get('password') as string || '';
    // Optional role — defaults to assistant for backward compat. Only admins can create admins.
    const requestedRole = (formData.get('role') as string || 'assistant').toLowerCase();
    const role = requestedRole === 'admin' ? 'admin' : 'assistant';
    if (!u || u.length < 2) return { success: false, error: 'Nom trop court (min 2 caractères)' };
    if (!p || p.length < 4) return { success: false, error: 'Mot de passe trop court (min 4 caractères)' };
    const exists = await prisma.hubUser.findUnique({ where: { username: u } });
    if (exists) return { success: false, error: 'Ce nom d’utilisateur existe déjà' };
    await prisma.$transaction(async (tx) => {
      const created = await tx.hubUser.create({ data: { username: u, passwordHash: hashPassword(p), role } });
      await logAudit(tx, {
        entityType: 'USER',
        entityId: created.id,
        action: role === 'admin' ? 'CREATE_ADMIN' : 'CREATE_ASSISTANT',
        details: `${role === 'admin' ? 'Administrateur' : 'Assistant'} créé: ${u}`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Session expirée', code: error.message };
    return { success: false, error: 'Erreur création utilisateur' };
  }
}

// Owner accounts — permanent, cannot be deleted or have password reset by others.
const PROTECTED_USERNAMES = new Set(['ff', 'ss']);

export async function deleteAssistantUser(id: string) {
  try {
    const session = await requireAdmin();
    const target = await prisma.hubUser.findUnique({ where: { id } });
    if (!target) return { success: false, error: 'Utilisateur introuvable' };
    if (target.id === session.id) return { success: false, error: 'Impossible de supprimer votre propre compte' };
    if (PROTECTED_USERNAMES.has(target.username.toLowerCase())) {
      return { success: false, error: 'Ce compte propriétaire est protégé et ne peut pas être supprimé' };
    }
    // Prevent deleting the very last admin (would lock everyone out)
    if (target.role === 'admin') {
      const adminCount = await prisma.hubUser.count({ where: { role: 'admin' } });
      if (adminCount <= 1) return { success: false, error: 'Impossible de supprimer le dernier administrateur' };
    }
    await prisma.$transaction(async (tx) => {
      await tx.hubUser.delete({ where: { id } });
      await logAudit(tx, {
        entityType: 'USER', entityId: id,
        action: target.role === 'admin' ? 'DELETE_ADMIN' : 'DELETE_ASSISTANT',
        details: `${target.role === 'admin' ? 'Administrateur' : 'Assistant'} supprimé: ${target.username}`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Session expirée', code: error.message };
    return { success: false, error: 'Erreur suppression' };
  }
}

export async function changeUserPassword(formData: FormData) {
  try {
    const session = await requireSession();
    const uid = formData.get('userId') as string;
    const np = formData.get('newPassword') as string || '';
    const oldPw = formData.get('oldPassword') as string || '';
    if (!np || np.length < 6) return { success: false, error: 'Nouveau mot de passe trop court (min 6)' };

    const target = await prisma.hubUser.findUnique({ where: { id: uid } });
    if (!target) return { success: false, error: 'Utilisateur introuvable' };

    const isSelf = session.id === uid;
    const isAdminActing = session.role === 'admin' && !isSelf;
    if (!isSelf && !isAdminActing) return { success: false, error: 'Action non autorisée' };

    // Protected owner accounts can only change their OWN password
    if (!isSelf && PROTECTED_USERNAMES.has(target.username.toLowerCase())) {
      return { success: false, error: 'Ce compte propriétaire ne peut être modifié que par lui-même' };
    }

    // Self-change (any role): verify old password. Admin resetting someone else's pw: no check.
    if (isSelf) {
      if (!verifyPassword(oldPw, target.passwordHash)) {
        return { success: false, error: 'Ancien mot de passe incorrect' };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.hubUser.update({ where: { id: uid }, data: { passwordHash: hashPassword(np) } });
      await logAudit(tx, {
        entityType: 'USER', entityId: uid,
        action: isSelf ? 'PASSWORD_CHANGE_SELF' : 'PASSWORD_RESET_BY_ADMIN',
        details: isSelf ? `${target.username} a changé son mot de passe` : `Admin ${session.username} a réinitialisé le mot de passe de ${target.username}`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Session expirée', code: error.message };
    return { success: false, error: 'Erreur changement mot de passe' };
  }
}
