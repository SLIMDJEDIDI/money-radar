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
      // Clean up informal notes (no FK cascade — plain contactId) to avoid orphan rows.
      try { await tx.hubPartnerNote.deleteMany({ where: { contactId: id } }); } catch {}
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
          contactId, type: 'PAYABLE', category: 'Compensation',
          note: `Compensation automatique décaissé/encaissé (${settledUsd.toFixed(2)} $)`,
        },
      });

      await logAudit(tx, {
        entityType: 'CONTACT', entityId: contactId, action: 'SETTLE_DEBT',
        details: `Compensation décaissé/encaissé pour ${contact.name}: ${settledUsd.toFixed(2)} $`,
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
    // Strict type guard: only IN or OUT may ever be stored, so the balance sum can never
    // mis-classify a malformed movement.
    if (type !== 'IN' && type !== 'OUT') return { success: false, error: 'Type de mouvement invalide' };
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

// Receivable ("à récupérer"): money someone owes you. Stored as an UNSETTLED IN with NO
// scheduled date, so the existing settled-only balance logic keeps it OUT of the cash total
// AND out of the planned/forecast lists (those require a scheduledFor). It stays fully visible
// with its note until you tap "Récupéré", which settles it via the normal settleTndMovement.
const TND_RECEIVABLE_TAG = '🔖 À RÉCUPÉRER';
export async function createTndReceivable(formData: FormData) {
  try {
    const session = await requireSession();
    const amount = parseFloat(formData.get('amount') as string);
    const note = (formData.get('note') as string || '').trim();

    if (!note) return { success: false, error: 'La note est obligatoire pour la traçabilité' };
    if (!isFinite(amount) || amount <= 0) return { success: false, error: 'Montant invalide' };

    const taggedNote = `${TND_RECEIVABLE_TAG} · ${note}`;

    await prisma.$transaction(async (tx) => {
      const movement = await tx.hubTndMovement.create({
        data: { amount, type: 'IN', note: taggedNote, performedBy: session.username, scheduledFor: null, isSettled: false },
      });
      await logAudit(tx, {
        entityType: 'TREASURY', entityId: movement.id, action: 'TND_RECEIVABLE',
        details: `Créance enregistrée (hors solde): ${amount} TND — ${note}`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Session expirée', code: error.message };
    return { success: false, error: 'Erreur lors de l\'enregistrement' };
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

// ----------------------------------------------------
// 5b. ARCHIVE LEDGER (admin-only, independent cash box)
// ----------------------------------------------------
// Non-destructive provisioning: creates the archive table only if it is missing.
// Never drops or alters existing data. Admin-only.
export async function ensureArchiveTable() {
  try {
    await requireAdmin();
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HubArchiveMovement" (
        "id" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "type" TEXT NOT NULL,
        "note" TEXT NOT NULL,
        "performedBy" TEXT NOT NULL,
        "scheduledFor" TIMESTAMP(3),
        "isSettled" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HubArchiveMovement_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubArchiveMovement_createdAt_idx" ON "HubArchiveMovement" ("createdAt");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubArchiveMovement_type_idx" ON "HubArchiveMovement" ("type");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubArchiveMovement_scheduledFor_idx" ON "HubArchiveMovement" ("scheduledFor");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubArchiveMovement_isSettled_idx" ON "HubArchiveMovement" ("isSettled");`);
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Action non autorisée', code: error.message };
    return { success: false, error: 'Provisioning archive impossible' };
  }
}

// Non-destructive: adds the plannedType column to HubReminder if it is missing.
// Lets a planned movement carry its intended type (HELD/PAYABLE/RECEIVABLE).
export async function ensureReminderPlannedType() {
  try {
    await requireAdmin();
    await prisma.$executeRawUnsafe(`ALTER TABLE "HubReminder" ADD COLUMN IF NOT EXISTS "plannedType" TEXT NOT NULL DEFAULT 'RECEIVABLE';`);
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Action non autorisée', code: error.message };
    return { success: false, error: 'Provisioning rappel impossible' };
  }
}

// ----------------------------------------------------
// 5c. PARTNER NOTES (informal money owed, never in totals)
// ----------------------------------------------------
// Non-destructive provisioning: creates the table only if missing. Never alters data.
export async function ensurePartnerNoteTable() {
  try {
    await requireSession();
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HubPartnerNote" (
        "id" TEXT NOT NULL,
        "contactId" TEXT NOT NULL,
        "direction" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "currencyCode" TEXT NOT NULL DEFAULT 'TND',
        "text" TEXT NOT NULL,
        "createdBy" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HubPartnerNote_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubPartnerNote_contactId_idx" ON "HubPartnerNote" ("contactId");`);
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Action non autorisée', code: error.message };
    return { success: false, error: 'Provisioning notes impossible' };
  }
}

export async function createPartnerNote(formData: FormData) {
  try {
    const session = await requireSession();
    const contactId = (formData.get('contactId') as string || '').trim();
    const direction = formData.get('direction') as string;
    const text = (formData.get('text') as string || '').trim();
    const currencyCode = (formData.get('currencyCode') as string || 'TND').trim();
    const amount = parseFloat(formData.get('amount') as string);

    if (!contactId) return { success: false, error: 'Partenaire manquant' };
    if (direction !== 'THEY_OWE' && direction !== 'I_OWE') return { success: false, error: 'Sens invalide' };
    if (!text) return { success: false, error: 'La note est obligatoire' };
    if (!isFinite(amount) || amount < 0) return { success: false, error: 'Montant invalide' };

    await ensurePartnerNoteTable();
    await prisma.$transaction(async (tx) => {
      const note = await tx.hubPartnerNote.create({
        data: { contactId, direction, amount: amount || 0, currencyCode, text, createdBy: session.username },
      });
      await logAudit(tx, {
        entityType: 'PARTNER_NOTE', entityId: note.id, action: 'CREATE',
        details: `Note ${direction === 'THEY_OWE' ? 'il me doit' : 'je lui dois'}: ${amount} ${currencyCode} — ${text}`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Session expirée', code: error.message };
    return { success: false, error: 'Erreur lors de l\'ajout de la note' };
  }
}

export async function updatePartnerNote(formData: FormData) {
  try {
    const session = await requireSession();
    const id = (formData.get('id') as string || '').trim();
    const direction = formData.get('direction') as string;
    const text = (formData.get('text') as string || '').trim();
    const currencyCode = (formData.get('currencyCode') as string || 'TND').trim();
    const amount = parseFloat(formData.get('amount') as string);

    if (!id) return { success: false, error: 'Note manquante' };
    if (direction !== 'THEY_OWE' && direction !== 'I_OWE') return { success: false, error: 'Sens invalide' };
    if (!text) return { success: false, error: 'La note est obligatoire' };
    if (!isFinite(amount) || amount < 0) return { success: false, error: 'Montant invalide' };

    await prisma.$transaction(async (tx) => {
      await tx.hubPartnerNote.update({
        where: { id },
        data: { direction, amount: amount || 0, currencyCode, text },
      });
      await logAudit(tx, {
        entityType: 'PARTNER_NOTE', entityId: id, action: 'UPDATE',
        details: `Note modifiée: ${amount} ${currencyCode} — ${text}`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Session expirée', code: error.message };
    return { success: false, error: 'Erreur lors de la modification' };
  }
}

export async function deletePartnerNote(id: string) {
  try {
    const session = await requireSession();
    await prisma.$transaction(async (tx) => {
      await tx.hubPartnerNote.delete({ where: { id } });
      await logAudit(tx, {
        entityType: 'PARTNER_NOTE', entityId: id, action: 'DELETE',
        details: 'Note partenaire supprimée', modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Session expirée', code: error.message };
    return { success: false, error: 'Erreur lors de la suppression' };
  }
}

// ----------------------------------------------------
// 5d. CREDIT — sommes à payer plus tard, sans date d'échéance
// ----------------------------------------------------
// Registre TOTALEMENT INDÉPENDANT : n'entre dans aucun autre solde, total ou calcul.
// RÉSERVÉ À L'ADMINISTRATEUR : invisible et inaccessible aux assistants (ex. soumaya).
// Toutes les actions ci-dessous exigent requireAdmin() — masquer la section côté client ne
// protège rien, un assistant pourrait sinon appeler ces server actions directement.
// Provisioning non destructif : crée la table uniquement si elle est absente.
export async function ensureCreditTable() {
  try {
    await requireAdmin();
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HubCredit" (
        "id" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "currencyCode" TEXT NOT NULL DEFAULT 'TND',
        "beneficiary" TEXT NOT NULL,
        "note" TEXT NOT NULL,
        "isPaid" BOOLEAN NOT NULL DEFAULT false,
        "paidAt" TIMESTAMP(3),
        "paidBy" TEXT,
        "createdBy" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HubCredit_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubCredit_isPaid_idx" ON "HubCredit" ("isPaid");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubCredit_createdAt_idx" ON "HubCredit" ("createdAt");`);
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Action non autorisée', code: error.message };
    return { success: false, error: 'Provisioning crédit impossible' };
  }
}

export async function createCredit(formData: FormData) {
  try {
    const session = await requireAdmin();
    const amount = parseFloat(formData.get('amount') as string);
    const beneficiary = (formData.get('beneficiary') as string || '').trim();
    const note = (formData.get('note') as string || '').trim();
    const currencyCode = (formData.get('currencyCode') as string || 'TND').trim() || 'TND';

    if (!isFinite(amount) || amount <= 0) return { success: false, error: 'Montant invalide' };
    if (!beneficiary) return { success: false, error: 'Le bénéficiaire est obligatoire' };
    if (!note) return { success: false, error: 'La description est obligatoire' };

    await ensureCreditTable();
    await prisma.$transaction(async (tx) => {
      const credit = await tx.hubCredit.create({
        data: { amount, currencyCode, beneficiary, note, createdBy: session.username },
      });
      await logAudit(tx, {
        entityType: 'CREDIT', entityId: credit.id, action: 'CREATE',
        details: `Crédit ajouté: ${amount} ${currencyCode} — ${beneficiary} (${note})`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Action réservée à l\'administrateur', code: error.message };
    return { success: false, error: 'Erreur lors de l\'ajout du crédit' };
  }
}

export async function updateCredit(formData: FormData) {
  try {
    const session = await requireAdmin();
    const id = (formData.get('id') as string || '').trim();
    const amount = parseFloat(formData.get('amount') as string);
    const beneficiary = (formData.get('beneficiary') as string || '').trim();
    const note = (formData.get('note') as string || '').trim();

    if (!id) return { success: false, error: 'Crédit manquant' };
    if (!isFinite(amount) || amount <= 0) return { success: false, error: 'Montant invalide' };
    if (!beneficiary) return { success: false, error: 'Le bénéficiaire est obligatoire' };
    if (!note) return { success: false, error: 'La description est obligatoire' };

    await prisma.$transaction(async (tx) => {
      const before = await tx.hubCredit.findUnique({ where: { id } });
      await tx.hubCredit.update({ where: { id }, data: { amount, beneficiary, note } });
      await logAudit(tx, {
        entityType: 'CREDIT', entityId: id, action: 'UPDATE',
        details: `Crédit modifié: ${amount} — ${beneficiary} (${note})`,
        oldValue: before ? `${before.amount} — ${before.beneficiary} (${before.note})` : undefined,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Action réservée à l\'administrateur', code: error.message };
    return { success: false, error: 'Erreur lors de la modification' };
  }
}

// Marque un crédit comme PAYÉ (sort du total actif) ou annule ce marquage.
// L'entrée reste TOUJOURS dans l'historique — rien n'est supprimé.
export async function setCreditPaid(id: string, isPaid: boolean) {
  try {
    const session = await requireAdmin();
    if (!id) return { success: false, error: 'Crédit manquant' };
    await prisma.$transaction(async (tx) => {
      const credit = await tx.hubCredit.update({
        where: { id },
        data: isPaid
          ? { isPaid: true, paidAt: new Date(), paidBy: session.username }
          : { isPaid: false, paidAt: null, paidBy: null },
      });
      await logAudit(tx, {
        entityType: 'CREDIT', entityId: id, action: isPaid ? 'CREDIT_PAID' : 'CREDIT_UNPAID',
        details: `${isPaid ? 'Crédit marqué PAYÉ' : 'Crédit remis en attente'}: ${credit.amount} ${credit.currencyCode} — ${credit.beneficiary}`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Action réservée à l\'administrateur', code: error.message };
    return { success: false, error: 'Erreur lors du marquage' };
  }
}

// Suppression définitive — réservée à l'administrateur. Le flux normal est "marquer PAYÉ",
// qui conserve l'entrée dans l'historique.
export async function deleteCredit(id: string) {
  try {
    const session = await requireAdmin();
    await prisma.$transaction(async (tx) => {
      const credit = await tx.hubCredit.findUnique({ where: { id } });
      await tx.hubCredit.delete({ where: { id } });
      await logAudit(tx, {
        entityType: 'CREDIT', entityId: id, action: 'DELETE',
        details: `Crédit supprimé: ${credit?.amount ?? ''} ${credit?.currencyCode ?? ''} — ${credit?.beneficiary ?? ''}`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Action réservée à l\'administrateur', code: error.message };
    return { success: false, error: 'Erreur lors de la suppression' };
  }
}

export async function createArchiveMovement(formData: FormData) {
  try {
    const session = await requireAdmin();
    const amount = parseFloat(formData.get('amount') as string);
    const type = formData.get('type') as string; // "IN" or "OUT"
    const note = (formData.get('note') as string || '').trim();
    const scheduledForRaw = (formData.get('scheduledFor') as string || '').trim();

    if (!note) return { success: false, error: 'La note est obligatoire pour la traçabilité' };
    if (type !== 'IN' && type !== 'OUT') return { success: false, error: 'Type de mouvement invalide' };
    if (!isFinite(amount) || amount <= 0) return { success: false, error: 'Montant invalide' };

    let scheduledFor: Date | null = null;
    let isSettled = true;
    if (scheduledForRaw) {
      const d = new Date(scheduledForRaw);
      if (isNaN(d.getTime())) return { success: false, error: 'Date planifiée invalide' };
      const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
      if (d.getTime() > startOfToday.getTime()) { scheduledFor = d; isSettled = false; }
    }

    await prisma.$transaction(async (tx) => {
      const movement = await tx.hubArchiveMovement.create({
        data: { amount, type, note, performedBy: session.username, scheduledFor, isSettled },
      });
      await logAudit(tx, {
        entityType: 'ARCHIVE',
        entityId: movement.id,
        action: !isSettled ? (type === 'IN' ? 'ARCH_IN_SCHEDULED' : 'ARCH_OUT_SCHEDULED') : (type === 'IN' ? 'ARCH_IN' : 'ARCH_OUT'),
        details: !isSettled
          ? `${type === 'IN' ? 'Entrée' : 'Sortie'} ARCHIVE PLANIFIÉE ${amount} TND pour ${scheduledFor!.toLocaleDateString('fr-FR')}: ${note}`
          : `${type === 'IN' ? 'Entrée' : 'Sortie'} ARCHIVE de ${amount} TND: ${note}`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Action non autorisée', code: error.message };
    return { success: false, error: 'Erreur lors de l\'enregistrement' };
  }
}

// Admin-only special movement: transfer money FROM the TND treasury INTO the Archive box.
// Atomic — a single OUT (treasury) + IN (archive) are written together so the two caisses
// can never drift. Both notes carry the TRANSFER_TAG sentinel so each journal highlights them.
const TREASURY_ARCHIVE_TAG = '⇄ TRANSFERT COFFRE→ARCHIVE';
export async function transferTreasuryToArchive(formData: FormData) {
  try {
    const session = await requireAdmin();
    const amount = parseFloat(formData.get('amount') as string);
    const note = (formData.get('note') as string || '').trim();

    if (!note) return { success: false, error: 'La note est obligatoire pour la traçabilité' };
    if (!isFinite(amount) || amount <= 0) return { success: false, error: 'Montant invalide' };

    const taggedNote = `${TREASURY_ARCHIVE_TAG} · ${note}`;

    await prisma.$transaction(async (tx) => {
      const out = await tx.hubTndMovement.create({
        data: { amount, type: 'OUT', note: taggedNote, performedBy: session.username, scheduledFor: null, isSettled: true },
      });
      const inn = await tx.hubArchiveMovement.create({
        data: { amount, type: 'IN', note: taggedNote, performedBy: session.username, scheduledFor: null, isSettled: true },
      });
      await logAudit(tx, {
        entityType: 'TREASURY', entityId: out.id, action: 'TND_TRANSFER_ARCHIVE',
        details: `Transfert de ${amount} TND du Coffre vers l'Archive: ${note}`,
        modifiedBy: session.username,
      });
      await logAudit(tx, {
        entityType: 'ARCHIVE', entityId: inn.id, action: 'ARCH_TRANSFER_IN',
        details: `Réception de ${amount} TND depuis le Coffre: ${note}`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Action réservée à l\'administrateur', code: error.message };
    return { success: false, error: 'Erreur lors du transfert' };
  }
}

// ----------------------------------------------------
// 5d. BANQUE — multiple named bank accounts (assistant-visible, like Trésorerie)
// ----------------------------------------------------
// Non-destructive provisioning: creates both tables only if missing. Never alters data.
export async function ensureBankTables() {
  try {
    await requireSession();
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HubBankAccount" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "currencyCode" TEXT NOT NULL DEFAULT 'TND',
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HubBankAccount_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HubBankMovement" (
        "id" TEXT NOT NULL,
        "accountId" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "type" TEXT NOT NULL,
        "note" TEXT NOT NULL,
        "performedBy" TEXT NOT NULL,
        "scheduledFor" TIMESTAMP(3),
        "isSettled" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HubBankMovement_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubBankMovement_accountId_idx" ON "HubBankMovement" ("accountId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubBankMovement_isSettled_idx" ON "HubBankMovement" ("isSettled");`);
    // Ces deux index sont déclarés dans schema.prisma mais n'avaient jamais été créés :
    // la table est provisionnée par CREATE TABLE brut, pas par une migration Prisma, donc
    // seuls les index écrits ici existent réellement. `createdAt` est justement la colonne
    // de tri de chaque chargement (orderBy createdAt desc), et `scheduledFor` filtre les
    // mouvements planifiés. Ajout idempotent, sans effet sur les données.
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubBankMovement_createdAt_idx" ON "HubBankMovement" ("createdAt");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubBankMovement_scheduledFor_idx" ON "HubBankMovement" ("scheduledFor");`);
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Action non autorisée', code: error.message };
    return { success: false, error: 'Provisioning banque impossible' };
  }
}

export async function createBankAccount(formData: FormData) {
  try {
    const session = await requireSession();
    const name = (formData.get('name') as string || '').trim();
    const currencyCode = (formData.get('currencyCode') as string || 'TND').trim() || 'TND';
    if (!name) return { success: false, error: 'Le nom du compte est obligatoire' };

    await ensureBankTables();
    const account = await prisma.$transaction(async (tx) => {
      const count = await tx.hubBankAccount.count();
      const acc = await tx.hubBankAccount.create({ data: { name, currencyCode, sortOrder: count } });
      await logAudit(tx, {
        entityType: 'BANK', entityId: acc.id, action: 'BANK_ACCOUNT_CREATE',
        details: `Compte bancaire créé: ${name} (${currencyCode})`, modifiedBy: session.username,
      });
      return acc;
    });
    revalidatePath('/');
    return { success: true, account };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Session expirée', code: error.message };
    return { success: false, error: 'Erreur lors de la création du compte' };
  }
}

export async function renameBankAccount(formData: FormData) {
  try {
    const session = await requireSession();
    const id = (formData.get('id') as string || '').trim();
    const name = (formData.get('name') as string || '').trim();
    if (!id || !name) return { success: false, error: 'Nom invalide' };
    await prisma.$transaction(async (tx) => {
      await tx.hubBankAccount.update({ where: { id }, data: { name } });
      await logAudit(tx, { entityType: 'BANK', entityId: id, action: 'BANK_ACCOUNT_RENAME', details: `Compte renommé: ${name}`, modifiedBy: session.username });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Session expirée', code: error.message };
    return { success: false, error: 'Erreur lors du renommage' };
  }
}

// Deleting an account also removes its movements (admin-only, guarded).
export async function deleteBankAccount(id: string) {
  try {
    const session = await requireAdmin();
    await prisma.$transaction(async (tx) => {
      await tx.hubBankMovement.deleteMany({ where: { accountId: id } });
      await tx.hubBankAccount.delete({ where: { id } });
      await logAudit(tx, { entityType: 'BANK', entityId: id, action: 'BANK_ACCOUNT_DELETE', details: `Compte bancaire supprimé (et ses mouvements)`, modifiedBy: session.username });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Action réservée à l\'administrateur', code: error.message };
    return { success: false, error: 'Erreur lors de la suppression' };
  }
}

export async function createBankMovement(formData: FormData) {
  try {
    const session = await requireSession();
    const accountId = (formData.get('accountId') as string || '').trim();
    const amount = parseFloat(formData.get('amount') as string);
    const type = formData.get('type') as string;
    const note = (formData.get('note') as string || '').trim();
    const scheduledForRaw = (formData.get('scheduledFor') as string || '').trim();

    if (!accountId) return { success: false, error: 'Compte manquant' };
    if (!note) return { success: false, error: 'La note est obligatoire pour la traçabilité' };
    if (type !== 'IN' && type !== 'OUT') return { success: false, error: 'Type de mouvement invalide' };
    if (!isFinite(amount) || amount <= 0) return { success: false, error: 'Montant invalide' };

    const acc = await prisma.hubBankAccount.findUnique({ where: { id: accountId } });
    if (!acc) return { success: false, error: 'Compte bancaire introuvable' };

    let scheduledFor: Date | null = null;
    let isSettled = true;
    if (scheduledForRaw) {
      const d = new Date(scheduledForRaw);
      if (isNaN(d.getTime())) return { success: false, error: 'Date planifiée invalide' };
      const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
      if (d.getTime() > startOfToday.getTime()) { scheduledFor = d; isSettled = false; }
    }

    await prisma.$transaction(async (tx) => {
      const movement = await tx.hubBankMovement.create({
        data: { accountId, amount, type, note, performedBy: session.username, scheduledFor, isSettled },
      });
      await logAudit(tx, {
        entityType: 'BANK', entityId: movement.id,
        action: !isSettled ? (type === 'IN' ? 'BANK_IN_SCHEDULED' : 'BANK_OUT_SCHEDULED') : (type === 'IN' ? 'BANK_IN' : 'BANK_OUT'),
        details: !isSettled
          ? `${type === 'IN' ? 'Entrée' : 'Sortie'} BANQUE PLANIFIÉE ${amount} pour ${scheduledFor!.toLocaleDateString('fr-FR')}: ${note}`
          : `${type === 'IN' ? 'Entrée' : 'Sortie'} BANQUE de ${amount}: ${note}`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Session expirée', code: error.message };
    return { success: false, error: 'Erreur lors de l\'enregistrement' };
  }
}

export async function createBankBatchDisbursement(formData: FormData) {
  try {
    const session = await requireSession();
    const accountId = (formData.get('accountId') as string || '').trim();
    const raw = formData.get('items') as string || '';
    const scheduledForRaw = (formData.get('scheduledFor') as string || '').trim();
    if (!accountId) return { success: false, error: 'Compte manquant' };
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return { success: false, error: 'Liste de décaissements invalide' }; }
    if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 30) return { success: false, error: 'Ajoutez entre 1 et 30 décaissements' };

    const items = parsed.map((row: any, index: number) => ({ amount: Number(row?.amount), note: String(row?.note || '').trim(), index: index + 1 }));
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
      const created = await Promise.all(items.map(item => tx.hubBankMovement.create({
        data: { accountId, amount: item.amount, type: 'OUT', note: item.note, performedBy: session.username, scheduledFor, isSettled },
      })));
      await logAudit(tx, {
        entityType: 'BANK', entityId: created[0]?.id,
        action: isSettled ? 'BANK_BATCH_OUT' : 'BANK_BATCH_OUT_SCHEDULED',
        details: `${items.length} décaissements BANQUE ${isSettled ? 'enregistrés' : 'planifiés'} — total ${total}${scheduledFor ? ` pour ${scheduledFor.toLocaleDateString('fr-FR')}` : ''}`,
        newValue: JSON.stringify(items.map(({ amount, note }) => ({ amount, note }))),
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true, count: items.length, total };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Session expirée', code: error.message };
    return { success: false, error: 'Erreur lors de l’enregistrement groupé' };
  }
}

export async function settleBankMovement(id: string) {
  try {
    const session = await requireSession();
    await prisma.$transaction(async (tx) => {
      const m = await tx.hubBankMovement.findUnique({ where: { id } });
      if (!m || m.isSettled) return;
      await tx.hubBankMovement.update({ where: { id }, data: { isSettled: true } });
      await logAudit(tx, { entityType: 'BANK', entityId: id, action: 'BANK_SETTLE', details: `Mouvement BANQUE confirmé (${m.amount} ${m.type})`, modifiedBy: session.username });
    });
    revalidatePath('/');
    return { success: true };
  } catch { return { success: false, error: 'Action non autorisée' }; }
}

export async function updateBankMovementNote(id: string, rawNote: string) {
  try {
    const session = await requireSession();
    const note = String(rawNote || '').trim();
    if (!id || !note) return { success: false, error: 'La note est obligatoire' };
    if (note.length > 1000) return { success: false, error: 'La note ne peut pas dépasser 1 000 caractères' };
    await prisma.$transaction(async (tx) => {
      const movement = await tx.hubBankMovement.findUnique({ where: { id } });
      if (!movement) throw new Error('NOT_FOUND');
      if (movement.note === note) return;
      await tx.hubBankMovement.update({ where: { id }, data: { note } });
      await logAudit(tx, { entityType: 'BANK', entityId: id, action: 'BANK_NOTE_EDIT', details: `Note BANQUE modifiée`, oldValue: movement.note, newValue: note, modifiedBy: session.username });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Session expirée', code: error.message };
    if (error?.message === 'NOT_FOUND') return { success: false, error: 'Mouvement introuvable' };
    return { success: false, error: 'Modification de la note impossible' };
  }
}

export async function deleteBankMovement(id: string) {
  try {
    const session = await requireAdmin();
    await prisma.$transaction(async (tx) => {
      const old = await tx.hubBankMovement.findUnique({ where: { id } });
      if (!old) return;
      await tx.hubBankMovement.delete({ where: { id } });
      await logAudit(tx, { entityType: 'BANK', entityId: id, action: 'BANK_DELETE', oldValue: JSON.stringify(old), details: `Suppression mouvement BANQUE: ${old.amount} (${old.type})`, modifiedBy: session.username });
    });
    revalidatePath('/');
    return { success: true };
  } catch { return { success: false, error: 'Action non autorisée' }; }
}

export async function createArchiveBatchDisbursement(formData: FormData) {
  try {
    const session = await requireAdmin();
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
      const created = await Promise.all(items.map(item => tx.hubArchiveMovement.create({
        data: { amount: item.amount, type: 'OUT', note: item.note, performedBy: session.username, scheduledFor, isSettled },
      })));
      await logAudit(tx, {
        entityType: 'ARCHIVE',
        entityId: created[0]?.id,
        action: isSettled ? 'ARCH_BATCH_OUT' : 'ARCH_BATCH_OUT_SCHEDULED',
        details: `${items.length} décaissements ARCHIVE ${isSettled ? 'enregistrés' : 'planifiés'} — total ${total} TND${scheduledFor ? ` pour ${scheduledFor.toLocaleDateString('fr-FR')}` : ''}`,
        newValue: JSON.stringify(items.map(({ amount, note }) => ({ amount, note }))),
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true, count: items.length, total };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Action non autorisée', code: error.message };
    return { success: false, error: 'Erreur lors de l’enregistrement groupé' };
  }
}

export async function settleArchiveMovement(id: string) {
  try {
    const session = await requireAdmin();
    await prisma.$transaction(async (tx) => {
      const m = await tx.hubArchiveMovement.findUnique({ where: { id } });
      if (!m) return;
      if (m.isSettled) return;
      await tx.hubArchiveMovement.update({ where: { id }, data: { isSettled: true } });
      await logAudit(tx, {
        entityType: 'ARCHIVE',
        entityId: id,
        action: 'ARCH_SETTLE',
        details: `Mouvement ARCHIVE confirmé (${m.amount} ${m.type})`,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'Action non autorisée' };
  }
}

export async function updateArchiveMovementNote(id: string, rawNote: string) {
  try {
    const session = await requireAdmin();
    const note = String(rawNote || '').trim();
    if (!id || !note) return { success: false, error: 'La note est obligatoire' };
    if (note.length > 1000) return { success: false, error: 'La note ne peut pas dépasser 1 000 caractères' };

    await prisma.$transaction(async (tx) => {
      const movement = await tx.hubArchiveMovement.findUnique({ where: { id } });
      if (!movement) throw new Error('NOT_FOUND');
      if (movement.note === note) return;
      await tx.hubArchiveMovement.update({ where: { id }, data: { note } });
      await logAudit(tx, {
        entityType: 'ARCHIVE',
        entityId: id,
        action: 'ARCH_NOTE_EDIT',
        details: `Note ARCHIVE modifiée — ${movement.type === 'IN' ? 'Entrée' : 'Sortie'} ${movement.amount} TND : « ${movement.note} » → « ${note} »`,
        oldValue: movement.note,
        newValue: note,
        modifiedBy: session.username,
      });
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Action non autorisée', code: error.message };
    if (error?.message === 'NOT_FOUND') return { success: false, error: 'Mouvement introuvable' };
    return { success: false, error: 'Modification de la note impossible' };
  }
}

// ONE-TIME MIGRATION: import the ARCHIVE partner's AVOIR (HELD) TND operations into the
// new ARCHIVE ledger as settled IN encaissements, preserving original date and note.
// Idempotent: refuses to run if the ledger already contains movements (prevents double import).
// Only HELD/TND transactions are imported (CRÉANCE/DETTE and non-TND are ignored).
export async function migrateArchivePartnerToLedger() {
  try {
    const session = await requireAdmin();
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.hubArchiveMovement.count();
      if (existing > 0) return { skipped: true, reason: 'ALREADY_POPULATED', imported: 0, total: 0 };

      const archiveContact = await tx.hubContact.findFirst({
        where: { name: { equals: 'archive', mode: 'insensitive' } },
      });
      if (!archiveContact) return { skipped: true, reason: 'NO_ARCHIVE_PARTNER', imported: 0, total: 0 };

      const ops = await tx.hubTransaction.findMany({
        where: { contactId: archiveContact.id, type: 'HELD', currencyCode: 'TND' },
        orderBy: { createdAt: 'asc' },
      });
      if (ops.length === 0) return { skipped: true, reason: 'NO_HELD_TND_OPS', imported: 0, total: 0 };

      let total = 0;
      for (const op of ops) {
        await tx.hubArchiveMovement.create({
          data: {
            amount: op.amount,
            type: 'IN',
            note: op.note && op.note.trim() ? op.note : `Encaissement archivé (import ${op.createdAt.toLocaleDateString('fr-FR')})`,
            performedBy: session.username,
            isSettled: true,
            scheduledFor: null,
            createdAt: op.createdAt, // preserve original date
          },
        });
        total += op.amount;
      }
      await logAudit(tx, {
        entityType: 'ARCHIVE',
        entityId: archiveContact.id,
        action: 'ARCH_MIGRATE',
        details: `Migration ARCHIVE: ${ops.length} avoir(s) TND importés en encaissements — total ${total} TND`,
        newValue: JSON.stringify(ops.map(o => ({ amount: o.amount, note: o.note, date: o.createdAt }))),
        modifiedBy: session.username,
      });
      return { skipped: false, imported: ops.length, total };
    });
    revalidatePath('/');
    return { success: true, ...result };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Action non autorisée', code: error.message };
    return { success: false, error: 'Migration impossible' };
  }
}

// ONE-TIME CLEANUP: remove the now-redundant ARCHIVE partner after its cash has been
// migrated into the ARCHIVE ledger. SAFETY: refuses to delete unless the ledger already
// contains movements (proof the migration succeeded) — so the source is never removed
// before the copy exists. Idempotent: if the partner is already gone, returns success.
export async function retireArchivePartner() {
  try {
    const session = await requireAdmin();
    const result = await prisma.$transaction(async (tx) => {
      const ledgerCount = await tx.hubArchiveMovement.count();
      if (ledgerCount === 0) return { skipped: true, reason: 'LEDGER_EMPTY' };

      const archiveContact = await tx.hubContact.findFirst({
        where: { name: { equals: 'archive', mode: 'insensitive' } },
      });
      if (!archiveContact) return { skipped: true, reason: 'ALREADY_REMOVED' };

      const old = await tx.hubContact.findUnique({ where: { id: archiveContact.id }, include: { transactions: true } });
      await tx.hubContact.delete({ where: { id: archiveContact.id } }); // cascades transactions + reminders
      await logAudit(tx, {
        entityType: 'CONTACT',
        entityId: archiveContact.id,
        action: 'DELETE',
        oldValue: JSON.stringify(old),
        details: `Partenaire ARCHIVE retiré après migration vers le grand livre Archive (${ledgerCount} mouvement(s) présents).`,
        modifiedBy: session.username,
      });
      return { skipped: false, removed: true };
    });
    revalidatePath('/');
    return { success: true, ...result };
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'FORBIDDEN') return { success: false, error: 'Action non autorisée', code: error.message };
    return { success: false, error: 'Suppression du partenaire ARCHIVE impossible' };
  }
}

export async function deleteArchiveMovement(id: string) {
  try {
    const session = await requireAdmin();
    await prisma.$transaction(async (tx) => {
      const old = await tx.hubArchiveMovement.findUnique({ where: { id } });
      if (!old) return;
      await tx.hubArchiveMovement.delete({ where: { id } });
      await logAudit(tx, {
        entityType: 'ARCHIVE',
        entityId: id,
        action: 'ARCH_DELETE',
        oldValue: JSON.stringify(old),
        details: `Suppression mouvement ARCHIVE: ${old.amount} (${old.type})`,
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
      try { await tx.hubPartnerNote.deleteMany({}); } catch {}
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
  // Planned movement type: HELD (encaisser), PAYABLE (décaisser) or RECEIVABLE (rappel simple).
  const rawPlanned = formData.get('plannedType') as string || 'RECEIVABLE';
  const plannedType = ['HELD', 'PAYABLE', 'RECEIVABLE'].includes(rawPlanned) ? rawPlanned : 'RECEIVABLE';

  // Proper USD conversion using the currency rate
  const currency = await prisma.hubCurrency.findUnique({ where: { code: cur } });
  const rate = currency ? currency.rateToUsd : 1.0;
  const amountInUsd = amt * rate;

  await prisma.$transaction(async (tx) => {
    const reminder = await tx.hubReminder.create({
      data: { contactId: cid, amount: amt, currencyCode: cur, amountInUsd, dueDate: due, note, reminderEmail, plannedType }
    });
    const contact = await tx.hubContact.findUnique({ where: { id: cid } });
    const kind = plannedType === 'HELD' ? 'Encaissement prévu' : plannedType === 'PAYABLE' ? 'Décaissement prévu' : 'Paiement attendu';
    await logAudit(tx, {
      entityType: 'REMINDER', entityId: reminder.id, action: 'CREATE',
      details: `${kind}: ${amt} ${cur} · ${contact?.name} le ${due.toLocaleDateString('fr-FR')}`,
      modifiedBy: session.username,
    });
  });
  revalidatePath('/');
  return { success: true };
}

export async function toggleReminderCompleted(id: string, isCompleted: boolean) {
  const session = await requireAdmin();
  await prisma.$transaction(async (tx) => {
    const r = await tx.hubReminder.update({ where: { id }, data: { isCompleted } });
    await logAudit(tx, {
      entityType: 'REMINDER', entityId: id, action: isCompleted ? 'REMINDER_COMPLETE' : 'REMINDER_REOPEN',
      details: `Rappel ${isCompleted ? 'marqué terminé' : 'rouvert'} : ${r.amount} ${r.currencyCode}`,
      modifiedBy: session.username,
    });
  });
  revalidatePath('/');
  return { success: true };
}

// Confirm a PLANNED movement. Behaviour depends on its planned type:
//  - HELD    → book an ENCAISSER (pool +) real transaction on the partner
//  - PAYABLE → book a DÉCAISSER (pool −) real transaction on the partner
//  - RECEIVABLE (rappel simple) → just mark done, NEVER touches any balance
export async function confirmReminderReceived(id: string) {
  try {
    const session = await requireAdmin();
    await prisma.$transaction(async (tx) => {
      const reminder = await tx.hubReminder.findUnique({ where: { id }, include: { contact: true } });
      if (!reminder) throw new Error('NOT_FOUND');
      if (reminder.isCompleted) return;

      const planned = (reminder as any).plannedType || 'RECEIVABLE';
      const c = reminder.contact;

      if ((planned === 'HELD' || planned === 'PAYABLE') && c) {
        // Materialise the planned movement as a real transaction and apply it to the pool.
        await tx.hubTransaction.create({
          data: {
            amount: reminder.amount,
            currencyCode: reminder.currencyCode,
            amountInUsd: reminder.amountInUsd,
            contactId: c.id,
            type: planned,
            category: planned === 'HELD' ? 'Encaissement planifié' : 'Décaissement planifié',
            note: reminder.note || `Mouvement planifié confirmé (${new Date(reminder.dueDate).toLocaleDateString('fr-FR')})`,
          },
        });
        let h = c.heldBalanceUsd, p = c.payableBalanceUsd;
        if (planned === 'HELD') h += reminder.amountInUsd;
        else p += reminder.amountInUsd;
        await tx.hubContact.update({
          where: { id: c.id },
          data: { heldBalanceUsd: h, payableBalanceUsd: p, netPositionUsd: h + c.receivableBalanceUsd - p },
        });
      }

      // Mark reminder completed.
      await tx.hubReminder.update({ where: { id }, data: { isCompleted: true } });

      const verb = planned === 'HELD' ? 'Encaissement' : planned === 'PAYABLE' ? 'Décaissement' : 'Rappel';
      await logAudit(tx, {
        entityType: 'REMINDER', entityId: id, action: 'RECEIVED',
        details: `${verb} planifié confirmé · ${c?.name}: ${reminder.amount} ${reminder.currencyCode}`,
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
  const session = await requireAdmin();
  await prisma.$transaction(async (tx) => {
    const r = await tx.hubReminder.findUnique({ where: { id }, include: { contact: true } });
    await tx.hubReminder.delete({ where: { id } });
    await logAudit(tx, {
      entityType: 'REMINDER', entityId: id, action: 'DELETE',
      details: `Rappel supprimé : ${r?.amount ?? ''} ${r?.currencyCode ?? ''} — ${r?.contact?.name ?? 'partenaire inconnu'}`,
      oldValue: r?.note ?? undefined,
      modifiedBy: session.username,
    });
  });
  revalidatePath('/');
  return { success: true };
}

// Un taux de change convertit TOUTES les positions partenaires en USD : le modifier
// déplace la Position Globale du dashboard. C'est l'action la plus lourde de
// conséquences qui ne laissait AUCUNE trace. L'ancienne valeur est enregistrée pour
// pouvoir expliquer après coup un total qui a bougé.
export async function updateCurrencyRate(id: string, rate: string) {
  const session = await requireAdmin();
  const parsed = parseFloat(rate);
  if (!isFinite(parsed) || parsed <= 0) return { success: false, error: 'Taux invalide' };
  await prisma.$transaction(async (tx) => {
    const before = await tx.hubCurrency.findUnique({ where: { id } });
    const updated = await tx.hubCurrency.update({ where: { id }, data: { rateToUsd: parsed } });
    await logAudit(tx, {
      entityType: 'SETTING', entityId: id, action: 'CURRENCY_RATE_UPDATE',
      details: `Taux ${updated.code} : ${before?.rateToUsd ?? '?'} → ${parsed}`,
      oldValue: String(before?.rateToUsd ?? ''),
      newValue: String(parsed),
      modifiedBy: session.username,
    });
  });
  revalidatePath('/');
  return { success: true };
}

export async function toggleCurrencyActive(id: string, isActive: boolean) {
  const session = await requireAdmin();
  await prisma.$transaction(async (tx) => {
    const updated = await tx.hubCurrency.update({ where: { id }, data: { isActive } });
    await logAudit(tx, {
      entityType: 'SETTING', entityId: id, action: isActive ? 'CURRENCY_ENABLE' : 'CURRENCY_DISABLE',
      details: `Devise ${updated.code} ${isActive ? 'activée' : 'désactivée'}`,
      modifiedBy: session.username,
    });
  });
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
