import { prisma } from '../lib/db';

export interface HubMetrics {
  totalAvoirs: number;
  totalReceivables: number;
  totalPayables: number;
  upcomingPayments: number;
  netPosition: number;
}

export async function getHubDashboardData(searchQuery: string = '') {
  try {
    const currencies = await prisma.hubCurrency.findMany({ orderBy: { code: 'asc' } });
    const activeCurrencies = currencies.filter(c => c.isActive);
    const categories = await prisma.hubCategory.findMany({ orderBy: { name: 'asc' } });
    const contacts = await prisma.hubContact.findMany({ orderBy: { name: 'asc' } });

    const formattedContacts = contacts.map(c => ({
      id: c.id, name: c.name, emoji: c.emoji, country: c.country, isArchived: c.isArchived,
      heldBalanceUsd: c.heldBalanceUsd, receivableBalanceUsd: c.receivableBalanceUsd,
      payableBalanceUsd: c.payableBalanceUsd, netPositionUsd: c.netPositionUsd,
    }));

    const filteredContacts = formattedContacts.filter(c => {
      if (!searchQuery) return !c.isArchived;
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || (c.country && c.country.toLowerCase().includes(q));
    });

    const transactions = await prisma.hubTransaction.findMany({
      include: { contact: true },
      orderBy: { createdAt: 'desc' },
    });

    const filteredTransactions = transactions.filter(t => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return t.contact.name.toLowerCase().includes(q) || (t.note && t.note.toLowerCase().includes(q));
    });

    const reminders = await prisma.hubReminder.findMany({
      include: { contact: true },
      orderBy: { dueDate: 'asc' },
    });

    // GENERIC AUDIT FETCHING (Corrected for Facebook-fast V2)
    const auditTrails = await prisma.hubAuditTrail.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const users = await prisma.hubUser.findMany({ orderBy: { username: 'asc' } });

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
