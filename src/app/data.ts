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
    // Ensure core currencies exist
    const coreCodes = ['USD', 'RMB', 'EURO', 'TND'];
    const existingCurrencies = await prisma.hubCurrency.findMany({
      where: { code: { in: coreCodes } }
    });
    
    if (existingCurrencies.length < coreCodes.length) {
      const existingCodes = existingCurrencies.map(c => c.code);
      const missing = coreCodes.filter(c => !existingCodes.includes(c));
      
      for (const code of missing) {
        let symbol = '$', rate = 1.0;
        if (code === 'RMB') { symbol = '¥'; rate = 0.14; }
        else if (code === 'EURO') { symbol = '€'; rate = 1.08; }
        else if (code === 'TND') { symbol = 'DT'; rate = 0.32; }
        await prisma.hubCurrency.create({ data: { code, symbol, rateToUsd: rate } });
      }
    }

    // Parallel fetch for speed
    const [currencies, categories, contacts, transactions, reminders, auditTrails, users] = await Promise.all([
      prisma.hubCurrency.findMany({ orderBy: { code: 'asc' } }),
      prisma.hubCategory.findMany({ orderBy: { name: 'asc' } }),
      prisma.hubContact.findMany(), // Manual sorting below for complex logic
      prisma.hubTransaction.findMany({ include: { contact: true }, orderBy: { createdAt: 'desc' } }),
      prisma.hubReminder.findMany({ include: { contact: true }, orderBy: { dueDate: 'asc' } }),
      prisma.hubAuditTrail.findMany({ orderBy: { createdAt: 'desc' }, take: 40 }),
      // SECURITY: never expose passwordHash to the client
      prisma.hubUser.findMany({
        orderBy: { username: 'asc' },
        select: { id: true, username: true, role: true, canWrite: true, canEdit: true, canDelete: true, createdAt: true },
      })
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
