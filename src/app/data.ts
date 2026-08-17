import { prisma } from '../lib/db';
import { getSession } from '../lib/auth';

export interface HubMetrics {
  totalAvoirs: number;
  totalAvoirsTnd: number;
  totalReceivables: number;
  totalPayables: number;
  upcomingPayments: number;
  netPosition: number;
  tndBalance: number;
  tndTodayIn: number;
  tndTodayOut: number;
}

// Runs the one-off, idempotent self-healing DDL at most once per server instance instead of
// on every page load. Once the column exists this DDL is pure overhead (an extra DB round-trip
// on the critical path of every request), so we cache the "already ensured" state in memory.
let plannedTypeEnsured = false;
async function ensurePlannedTypeColumn() {
  if (plannedTypeEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "HubReminder" ADD COLUMN IF NOT EXISTS "plannedType" TEXT NOT NULL DEFAULT 'RECEIVABLE';`);
    plannedTypeEnsured = true;
  } catch {
    // Leave the flag false so a transient failure retries on the next request.
  }
}

// 1. Fetch all money hub data with "Facebook-fast" server-side sorting and aggregation
export async function getHubDashboardData(searchQuery: string = '') {
  try {
    // Self-healing: ensure the reminder plannedType column exists before any query selects it.
    // Idempotent, non-destructive, and now runs only once per server instance (see above).
    await ensurePlannedTypeColumn();

    const coreCodes = ['USD', 'RMB', 'EURO', 'TND'];

    // ------------------------------------------------------------------
    // UN SEUL ALLER-RETOUR PARALLÈLE.
    // Avant : les 8 requêtes ci-dessous étaient bien en Promise.all, mais ARCHIVE,
    // notes partenaires, BANQUE (2 requêtes) et CRÉDIT suivaient en `await`
    // séquentiels — soit 5 allers-retours Supabase supplémentaires, l'un après
    // l'autre, sur CHAQUE chargement de page et CHAQUE rafraîchissement.
    // Tout part maintenant en même temps. Les tables additives gardent leur
    // tolérance aux pannes via .catch(() => []) au lieu d'un try/await.
    //
    // CRÉDIT — réservé à l'administrateur : les données ne sont même pas ENVOYÉES
    // au navigateur d'un assistant (masquer le bouton ne suffirait pas, le payload
    // de la page et /api/dashboard-data resteraient lisibles). getSession() est mis
    // en cache par React et page.tsx l'a déjà appelé : résolution immédiate, donc la
    // requête crédits démarre elle aussi tout de suite.
    // ------------------------------------------------------------------
    const sessionPromise = getSession();
    const creditsPromise: Promise<any[]> = sessionPromise.then((s) =>
      s?.role === 'admin'
        ? prisma.hubCredit.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => [] as any[])
        : ([] as any[])
    );

    const [
      currenciesRaw, categories, contacts, transactions, reminders, auditTrails, users, tndMovements,
      archiveMovements, partnerNotes, bankAccounts, bankMovements, session, credits,
    ] = await Promise.all([
      prisma.hubCurrency.findMany({ orderBy: { code: 'asc' } }),
      prisma.hubCategory.findMany({ orderBy: { name: 'asc' } }),
      prisma.hubContact.findMany(), // Manual sorting below
      prisma.hubTransaction.findMany({ include: { contact: true }, orderBy: { createdAt: 'desc' } }),
      prisma.hubReminder.findMany({ include: { contact: true }, orderBy: { dueDate: 'asc' } }),
      prisma.hubAuditTrail.findMany({ orderBy: { createdAt: 'desc' }, take: 40 }),
      prisma.hubUser.findMany({
        orderBy: { username: 'asc' },
        select: { id: true, username: true, role: true, canWrite: true, canEdit: true, canDelete: true, createdAt: true },
      }),
      prisma.hubTndMovement.findMany({ orderBy: { createdAt: 'desc' } }),
      // Tables additives : tolérantes si elles ne sont pas encore provisionnées.
      prisma.hubArchiveMovement.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => [] as any[]),
      prisma.hubPartnerNote.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => [] as any[]),
      prisma.hubBankAccount.findMany({ orderBy: { sortOrder: 'asc' } }).catch(() => [] as any[]),
      prisma.hubBankMovement.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => [] as any[]),
      sessionPromise,
      creditsPromise,
    ]);

    const isAdmin = session?.role === 'admin';

    // Amorçage des devises de base. Avant, un findMany dédié tournait AVANT le batch
    // pour vérifier leur présence — la table devises était donc lue DEUX fois à chaque
    // chargement, dont une en série. On réutilise maintenant la lecture du batch, et on
    // ne repasse en base que dans le cas rare où il manque vraiment une devise.
    let currencies = currenciesRaw;
    const missingCodes = coreCodes.filter((c) => !currencies.some((x: any) => x.code === c));
    if (missingCodes.length > 0) {
      for (const code of missingCodes) {
        let symbol = '$', rate = 1.0;
        if (code === 'RMB') { symbol = '¥'; rate = 0.14; }
        else if (code === 'EURO') { symbol = '€'; rate = 1.08; }
        else if (code === 'TND') { symbol = 'DT'; rate = 0.32; }
        await prisma.hubCurrency.create({ data: { code, symbol, rateToUsd: rate } });
      }
      currencies = await prisma.hubCurrency.findMany({ orderBy: { code: 'asc' } });
    }
    // Total CREDIT ACTIF = uniquement les entrées non payées. Une entrée marquée PAYÉE
    // quitte ce total mais reste dans l'historique.
    const creditTotal = credits.reduce((s, c) => (c.isPaid ? s : s + (c.amount || 0)), 0);
    const creditPaidTotal = credits.reduce((s, c) => (c.isPaid ? s + (c.amount || 0) : s), 0);
    const creditOpenCount = credits.filter(c => !c.isPaid).length;

    const activeCurrencies = currencies.filter(c => c.isActive);

    // TND Treasury Logic
    let tndBalance = 0;
    let tndTodayIn = 0;
    let tndTodayOut = 0;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Only SETTLED movements count in the real balance
    tndMovements.forEach(m => {
      if (!m.isSettled) return;
      if (m.type === 'IN') {
        tndBalance += m.amount;
        if (m.createdAt >= startOfToday) tndTodayIn += m.amount;
      } else {
        tndBalance -= m.amount;
        if (m.createdAt >= startOfToday) tndTodayOut += m.amount;
      }
    });

    // PENDING (scheduled, not yet settled) — surfaces reminders + forecast net
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 3600 * 1000);
    const upcomingPending = tndMovements
      .filter(m => !m.isSettled && m.scheduledFor)
      .sort((a, b) => (a.scheduledFor!.getTime() - b.scheduledFor!.getTime()));
    const dueNowOrSoon = upcomingPending.filter(m => m.scheduledFor!.getTime() <= in24h.getTime()); // J-1 window
    const overdue = upcomingPending.filter(m => m.scheduledFor!.getTime() < now.getTime());
    const pendingInflow = upcomingPending.filter(m => m.type === 'IN').reduce((s, m) => s + m.amount, 0);
    const pendingOutflow = upcomingPending.filter(m => m.type === 'OUT').reduce((s, m) => s + m.amount, 0);

    // Projected balance = current balance + net of USER-SCHEDULED movements only.
    // No auto-extrapolation (historical averages give false precision).
    const tndProjectedBalance = tndBalance + pendingInflow - pendingOutflow;

    // ARCHIVE ledger aggregation — same settled-only rule as the TND treasury.
    let archiveBalance = 0;
    let archiveTodayIn = 0;
    let archiveTodayOut = 0;
    archiveMovements.forEach(m => {
      if (!m.isSettled) return;
      if (m.type === 'IN') {
        archiveBalance += m.amount;
        if (m.createdAt >= startOfToday) archiveTodayIn += m.amount;
      } else {
        archiveBalance -= m.amount;
        if (m.createdAt >= startOfToday) archiveTodayOut += m.amount;
      }
    });
    const archiveUpcoming = archiveMovements
      .filter(m => !m.isSettled && m.scheduledFor)
      .sort((a, b) => (a.scheduledFor!.getTime() - b.scheduledFor!.getTime()));
    const archiveDueSoon = archiveUpcoming.filter(m => m.scheduledFor!.getTime() <= in24h.getTime());
    const archiveOverdue = archiveUpcoming.filter(m => m.scheduledFor!.getTime() < now.getTime());
    const archivePendingIn = archiveUpcoming.filter(m => m.type === 'IN').reduce((s, m) => s + m.amount, 0);
    const archivePendingOut = archiveUpcoming.filter(m => m.type === 'OUT').reduce((s, m) => s + m.amount, 0);

    // BANQUE per-account aggregation — same settled-only rule as the treasury.
    const bankAccountsWithStats = bankAccounts.map(acc => {
      let balance = 0, todayIn = 0, todayOut = 0, pendingIn = 0, pendingOut = 0;
      for (const m of bankMovements) {
        if (m.accountId !== acc.id) continue;
        if (!m.isSettled) {
          if (m.scheduledFor) { if (m.type === 'IN') pendingIn += m.amount; else pendingOut += m.amount; }
          continue;
        }
        if (m.type === 'IN') { balance += m.amount; if (m.createdAt >= startOfToday) todayIn += m.amount; }
        else { balance -= m.amount; if (m.createdAt >= startOfToday) todayOut += m.amount; }
      }
      return { id: acc.id, name: acc.name, currencyCode: acc.currencyCode, sortOrder: acc.sortOrder, balance, todayIn, todayOut, pendingIn, pendingOut };
    });

    // Per-contact TND held breakdown
    const tndHeldByContact: Record<string, { tnd: number; usd: number }> = {};
    transactions.forEach(t => {
      if (t.type !== 'HELD' || t.currencyCode !== 'TND') return;
      const entry = tndHeldByContact[t.contactId] || { tnd: 0, usd: 0 };
      entry.tnd += t.amount;
      entry.usd += t.amountInUsd;
      tndHeldByContact[t.contactId] = entry;
    });

    const formattedContacts = contacts.map(c => {
      const tnd = tndHeldByContact[c.id] || { tnd: 0, usd: 0 };
      const heldUsdOnly = c.heldBalanceUsd - tnd.usd;
      return {
        id: c.id, name: c.name, emoji: c.emoji, country: c.country, isArchived: c.isArchived,
        heldBalanceUsd: heldUsdOnly,
        heldBalanceTnd: tnd.tnd,
        receivableBalanceUsd: c.receivableBalanceUsd,
        payableBalanceUsd: c.payableBalanceUsd,
        netPositionUsd: heldUsdOnly + c.receivableBalanceUsd - c.payableBalanceUsd,
      };
    }).sort((a, b) => {
      const aHasMoney = Math.abs(a.netPositionUsd) > 0.01 || a.heldBalanceUsd > 0.01 || a.receivableBalanceUsd > 0.01 || a.payableBalanceUsd > 0.01 || (a.heldBalanceTnd || 0) > 0.01;
      const bHasMoney = Math.abs(b.netPositionUsd) > 0.01 || b.heldBalanceUsd > 0.01 || b.receivableBalanceUsd > 0.01 || b.payableBalanceUsd > 0.01 || (b.heldBalanceTnd || 0) > 0.01;
      if (aHasMoney && !bHasMoney) return -1;
      if (!aHasMoney && bHasMoney) return 1;
      return a.name.localeCompare(b.name);
    });

    const filteredContacts = formattedContacts.filter(c => {
      if (!searchQuery) return !c.isArchived;
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || (c.country && c.country.toLowerCase().includes(q));
    });

    const filteredTransactions = transactions.filter(t => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return t.contact.name.toLowerCase().includes(q) || (t.note && t.note.toLowerCase().includes(q));
    });

    let totalAvoirs = 0, totalReceivables = 0, totalPayables = 0, upcomingPayments = 0;
    contacts.forEach(c => {
      if (c.isArchived) return;
      totalAvoirs += c.heldBalanceUsd;
      totalReceivables += c.receivableBalanceUsd;
      totalPayables += c.payableBalanceUsd;
    });
    reminders.forEach(r => { if (!r.isCompleted) upcomingPayments += r.amountInUsd; });

    const archivedContactIds = new Set(contacts.filter(c => c.isArchived).map(c => c.id));
    let totalAvoirsTnd = 0;
    let totalAvoirsTndInUsd = 0;
    transactions.forEach(t => {
      if (t.type !== 'HELD' || t.currencyCode !== 'TND') return;
      if (archivedContactIds.has(t.contactId)) return;
      totalAvoirsTnd += t.amount;
      totalAvoirsTndInUsd += t.amountInUsd;
    });
    const totalAvoirsUsd = totalAvoirs - totalAvoirsTndInUsd;

    return {
      contacts: filteredContacts,
      allContacts: formattedContacts,
      currencies,
      activeCurrencies,
      categories,
      transactions: filteredTransactions,
      reminders,
      auditTrails,
      users,
      tndMovements,
      tndUpcoming: upcomingPending,
      tndDueSoon: dueNowOrSoon,
      tndOverdue: overdue,
      tndForecast: {
        projectedBalance: tndProjectedBalance,
        pendingInflow,
        pendingOutflow,
        pendingCount: upcomingPending.length,
      },
      archiveMovements,
      archiveUpcoming,
      archiveDueSoon,
      archiveOverdue,
      partnerNotes,
      bankAccounts: bankAccountsWithStats,
      bankMovements,
      credits,
      metrics: {
        totalAvoirs: totalAvoirsUsd,
        totalAvoirsTnd,
        totalReceivables, totalPayables, upcomingPayments,
        netPosition: totalAvoirsUsd + totalReceivables - totalPayables,
        tndBalance,
        tndTodayIn,
        tndTodayOut,
        tndPendingIn: pendingInflow,
        tndPendingOut: pendingOutflow,
        archiveBalance,
        archiveTodayIn,
        archiveTodayOut,
        archivePendingIn,
        archivePendingOut,
        // CREDIT — exposé uniquement pour la section CREDIT. Volontairement absent de
        // netPosition, tndBalance, TOTAL TND et de tout autre agrégat.
        creditTotal,
        creditPaidTotal,
        creditOpenCount,
      },
    };
  } catch (error) {
    console.error('Data error:', error);
    throw new Error('Database loading failed');
  }
}
