import { prisma } from '../lib/db';

// Stable currency conversion rates to USD (base currency)
export const CURRENCY_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,
  TND: 0.32,
};

export interface HolderSummary {
  id: string;
  name: string;
  emoji: string;
  color: string;      // "green" (owed to you), "blue" (your own), "orange" (inventory/transit), "red" (you owe)
  category: string;   // "holder" (your own), "partner" (3rd parties), "upcoming" (debit areas)
  partnerType: string | null; // "person" | "company"
  isUpcoming: boolean;
  expectedBalance: number; // Aggregated USD
  actualBalance: number;   // Aggregated USD
  difference: number;      // Aggregated USD
  isSpecialTransit: boolean;
  balances: {
    currency: string;
    expectedBalance: number;
    actualBalance: number;
  }[];
}

export interface DashboardMetrics {
  totalWealth: number;
  availableCash: number;
  partnersBalance: number; // Net position of 3rd party partners (owed to you - owed by you)
  upcomingPayments: number; // Upcoming future debit payments total (expected)
  expectedTotalWealth: number;
}

// 1. Fetch all money holders with multi-currency wallets and calculate simplified metrics
export async function getDashboardData(searchQuery: string = '') {
  try {
    const holders = await prisma.moneyHolder.findMany({
      include: {
        balances: true,
      },
      orderBy: { name: 'asc' },
    });

    const formattedHolders: HolderSummary[] = holders.map((h) => {
      const diff = h.actualBalance - h.expectedBalance;
      return {
        id: h.id,
        name: h.name,
        emoji: h.emoji || '💵',
        color: h.color || 'blue',
        category: h.category || 'holder',
        partnerType: h.partnerType,
        isUpcoming: h.isUpcoming,
        expectedBalance: h.expectedBalance,
        actualBalance: h.actualBalance,
        difference: diff,
        isSpecialTransit: h.isSpecialTransit,
        balances: h.balances.map((b) => ({
          currency: b.currency,
          expectedBalance: b.expectedBalance,
          actualBalance: b.actualBalance,
        })),
      };
    });

    // Filtering logic
    const filteredHolders = formattedHolders.filter((h) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      
      const matchesCurrency = h.balances.some(b => b.currency.toLowerCase().includes(q));
      
      return (
        h.name.toLowerCase().includes(q) ||
        h.category.toLowerCase().includes(q) ||
        h.color.toLowerCase().includes(q) ||
        matchesCurrency
      );
    });

    // Initialize metrics
    let availableCash = 0;
    let partnersBalance = 0; // Net position: Money owed to you (green) - Money you owe (red)
    let upcomingPayments = 0; // expected future debit payments

    let expectedAvailableCash = 0;
    let expectedPartnersBalance = 0;

    holders.forEach((h) => {
      // 1. Future upcoming payments (debits) - skip active asset pools
      if (h.category === 'upcoming' || h.isUpcoming) {
        upcomingPayments += h.expectedBalance; // Track sum of expected upcoming payments
        return;
      }

      // 2. Active holders/wallets vs partners
      if (h.category === 'holder') {
        availableCash += h.actualBalance;
        expectedAvailableCash += h.expectedBalance;
      } else if (h.category === 'partner') {
        // Green means they owe you (asset, positive), Red means you owe them (liability, negative)
        if (h.color === 'green') {
          partnersBalance += h.actualBalance;
          expectedPartnersBalance += h.expectedBalance;
        } else if (h.color === 'red') {
          partnersBalance -= h.actualBalance;
          expectedPartnersBalance -= h.expectedBalance;
        }
      }
    });

    // Total Wealth = Available Cash + Net Partners Position
    const totalWealth = availableCash + partnersBalance;
    const expectedTotalWealth = expectedAvailableCash + expectedPartnersBalance;

    const metrics: DashboardMetrics = {
      totalWealth,
      availableCash,
      partnersBalance,
      upcomingPayments,
      expectedTotalWealth,
    };

    return {
      holders: filteredHolders,
      metrics,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    throw new Error('Could not fetch data');
  }
}

// 2. Get individual Holder details, balance, and timeline
export async function getHolderDetails(holderId: string) {
  try {
    const holder = await prisma.moneyHolder.findUnique({
      where: { id: holderId },
      include: {
        balances: true,
      },
    });

    if (!holder) {
      throw new Error('Holder not found');
    }

    const movements = await prisma.moneyMovement.findMany({
      where: {
        OR: [
          { fromHolderId: holderId },
          { toHolderId: holderId },
        ],
      },
      include: {
        fromHolder: true,
        toHolder: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      holder: {
        id: holder.id,
        name: holder.name,
        emoji: holder.emoji,
        color: holder.color,
        category: holder.category,
        partnerType: holder.partnerType,
        isUpcoming: holder.isUpcoming,
        expectedBalance: holder.expectedBalance,
        actualBalance: holder.actualBalance,
        isSpecialTransit: holder.isSpecialTransit,
        balances: holder.balances.map((b) => ({
          currency: b.currency,
          expectedBalance: b.expectedBalance,
          actualBalance: b.actualBalance,
        })),
      },
      movements,
    };
  } catch (error) {
    console.error('Failed to get holder details:', error);
    throw error;
  }
}

// 3. Get recent movements for general search/timeline
export async function getRecentMovements(searchQuery: string = '') {
  try {
    const movements = await prisma.moneyMovement.findMany({
      include: {
        fromHolder: true,
        toHolder: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!searchQuery) {
      return movements;
    }

    const q = searchQuery.toLowerCase();
    return movements.filter((m) => {
      const fromName = m.fromHolder?.name.toLowerCase() || 'external';
      const toName = m.toHolder?.name.toLowerCase() || 'external';
      const note = m.note?.toLowerCase() || '';
      const amountStr = m.amount.toString();
      const currency = m.currency.toLowerCase();

      return (
        fromName.includes(q) ||
        toName.includes(q) ||
        note.includes(q) ||
        amountStr.includes(q) ||
        currency.includes(q)
      );
    });
  } catch (error) {
    console.error('Failed to get movements:', error);
    throw error;
  }
}
