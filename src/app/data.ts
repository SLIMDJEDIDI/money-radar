import { prisma } from '../lib/db';

export interface HubMetrics {
  totalAvoirs: number;
  totalReceivables: number;
  totalPayables: number;
  upcomingPayments: number;
  netPosition: number;
}

// 1. Fetch all money hub data with "Facebook-fast" server-side sorting and aggregation
export async function getHubDashboardData(searchQuery: string = '') {
  try {
    // Ensure RMB exists
    const rmb = await prisma.hubCurrency.findUnique({ where: { code: 'RMB' } });
    if (!rmb) {
      await prisma.hubCurrency.create({ data: { code: 'RMB', symbol: '¥', rateToUsd: 0.14 } });
    }

    // Parallel fetch for speed
    const [currencies, categories, contacts, transactions, reminders, auditTrails, users] = await Promise.all([
      prisma.hubCurrency.findMany({ orderBy: { code: 'asc' } }),
      prisma.hubCategory.findMany({ orderBy: { name: 'asc' } }),
      prisma.hubContact.findMany(), // Manual sorting below for complex logic
      prisma.hubTransaction.findMany({ include: { contact: true }, orderBy: { createdAt: 'desc' } }),
      prisma.hubReminder.findMany({ include: { contact: true }, orderBy: { dueDate: 'asc' } }),
      prisma.hubAuditTrail.findMany({ orderBy: { createdAt: 'desc' }, take: 40 }),
      prisma.hubUser.findMany({ orderBy: { username: 'asc' } })
    ]);

    const activeCurrencies = currencies.filter(c => c.isActive);

    // 2. Logic: Show partners with non-zero balances FIRST
    // Sort logic: 1. Non-zero absolute net position first. 2. Alphabetical secondary.
    const formattedContacts = contacts.map(c => ({
      id: c.id, name: c.name, emoji: c.emoji, country: c.country, isArchived: c.isArchived,
      heldBalanceUsd: c.heldBalanceUsd, receivableBalanceUsd: c.receivableBalanceUsd,
      payableBalanceUsd: c.payableBalanceUsd, netPositionUsd: c.netPositionUsd,
    })).sort((a, b) => {
      const aHasMoney = Math.abs(a.netPositionUsd) > 0.01 || a.heldBalanceUsd > 0.01 || a.receivableBalanceUsd > 0.01 || a.payableBalanceUsd > 0.01;
      const bHasMoney = Math.abs(b.netPositionUsd) > 0.01 || b.heldBalanceUsd > 0.01 || b.receivableBalanceUsd > 0.01 || b.payableBalanceUsd > 0.01;
      
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

    // 3. Metrics Aggregation
    let totalAvoirs = 0, totalReceivables = 0, totalPayables = 0, upcomingPayments = 0;
    contacts.forEach(c => {
      if (c.isArchived) return;
      totalAvoirs += c.heldBalanceUsd;
      totalReceivables += c.receivableBalanceUsd;
      totalPayables += c.payableBalanceUsd;
    });
    reminders.forEach(r => { if (!r.isCompleted) upcomingPayments += r.amountInUsd; });

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
      metrics: {
        totalAvoirs, totalReceivables, totalPayables, upcomingPayments,
        netPosition: totalAvoirs + totalReceivables - totalPayables
      },
    };
  } catch (error) {
    console.error('Data error:', error);
    throw new Error('Database loading failed');
  }
}
