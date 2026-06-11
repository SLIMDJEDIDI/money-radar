import { prisma } from '../lib/db';

export interface ContactSummary {
  id: string;
  name: string;
  emoji: string;
  country: string | null;
  isArchived: boolean;
  heldBalanceUsd: number;      // Avoirs (Aggregated USD)
  receivableBalanceUsd: number; // Créances (Aggregated USD)
  payableBalanceUsd: number;    // Dettes (Aggregated USD)
  netPositionUsd: number;       // held + receivable - payable
}

export interface HubMetrics {
  totalAvoirs: number;       // Total des avoirs
  totalReceivables: number;   // Argent à recevoir
  totalPayables: number;      // Argent à payer
  upcomingPayments: number;   // Paiements à venir (Reminders expected)
  netPosition: number;        // Position nette (Avoirs + Créances - Dettes)
}

// 1. Core Fetcher for the Dashboard (Server-Side rendering query)
export async function getHubDashboardData(searchQuery: string = '') {
  try {
    // Fetch all active currencies & exchange rates
    const currencies = await prisma.hubCurrency.findMany({
      orderBy: { code: 'asc' },
    });

    const activeCurrencies = currencies.filter(c => c.isActive);

    // Fetch active categories
    const categories = await prisma.hubCategory.findMany({
      orderBy: { name: 'asc' },
    });

    // Fetch all contacts (including archived if searched, but default non-archived)
    const contacts = await prisma.hubContact.findMany({
      orderBy: { name: 'asc' },
    });

    const formattedContacts: ContactSummary[] = contacts.map(c => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji || '👤',
      country: c.country,
      isArchived: c.isArchived,
      heldBalanceUsd: c.heldBalanceUsd,
      receivableBalanceUsd: c.receivableBalanceUsd,
      payableBalanceUsd: c.payableBalanceUsd,
      netPositionUsd: c.netPositionUsd,
    }));

    // Filter contacts based on search query
    const filteredContacts = formattedContacts.filter(c => {
      if (!searchQuery) return !c.isArchived; // Don't show archived by default
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.country && c.country.toLowerCase().includes(q))
      );
    });

    // Fetch all transactions with custom order by creation
    const transactions = await prisma.hubTransaction.findMany({
      include: {
        contact: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const filteredTransactions = transactions.filter(t => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.contact.name.toLowerCase().includes(q) ||
        (t.note && t.note.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q) ||
        t.currencyCode.toLowerCase().includes(q) ||
        t.amount.toString().includes(q)
      );
    });

    // Fetch all pending reminders
    const reminders = await prisma.hubReminder.findMany({
      include: {
        contact: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    const filteredReminders = reminders.filter(r => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.contact.name.toLowerCase().includes(q) ||
        r.currencyCode.toLowerCase().includes(q) ||
        (r.note && r.note.toLowerCase().includes(q))
      );
    });

    // Fetch Audit trails
    const auditTrails = await prisma.hubAuditTrail.findMany({
      include: {
        transaction: {
          include: {
            contact: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    // Fetch Users list
    const users = await prisma.hubUser.findMany({
      orderBy: { username: 'asc' },
    });

    // Calculate Dashboard metrics based on the specified formulas:
    let totalAvoirs = 0;
    let totalReceivables = 0;
    let totalPayables = 0;
    let upcomingPayments = 0;

    contacts.forEach((c) => {
      if (c.isArchived) return; // Skip archived contacts from dashboard metrics
      totalAvoirs += c.heldBalanceUsd;
      totalReceivables += c.receivableBalanceUsd;
      totalPayables += c.payableBalanceUsd;
    });

    // Calculate upcoming payments (sum of incomplete reminders)
    reminders.forEach((r) => {
      if (!r.isCompleted) {
        upcomingPayments += r.amountInUsd;
      }
    });

    // Position nette = Avoirs + Créances - Dettes
    const netPosition = totalAvoirs + totalReceivables - totalPayables;

    const metrics: HubMetrics = {
      totalAvoirs,
      totalReceivables,
      totalPayables,
      upcomingPayments,
      netPosition,
    };

    return {
      contacts: filteredContacts,
      allContacts: formattedContacts,
      currencies,
      activeCurrencies,
      categories,
      transactions: filteredTransactions,
      reminders: filteredReminders,
      auditTrails,
      users,
      metrics,
    };
  } catch (error) {
    console.error('Failed to fetch MONEY HUB data:', error);
    throw new Error('Database loading failed');
  }
}
