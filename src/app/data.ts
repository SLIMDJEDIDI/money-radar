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
  color: string;      // "green" (owed to you), "blue" (your own), "orange" (inventory), "red" (you owe)
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
  inventoryValue: number;
  receivables: number;
  payables: number;
  upcomingPayments: number; // Upcoming future debit payments total
  expectedTotalWealth: number;
}

// 1. Fetch all money holders with multi-currency wallets and calculate metrics
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
      
      // Match name, category, color, or specific currencies held
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
    let receivables = 0;
    let inventoryValue = 0;
    let payables = 0;
    let upcomingPayments = 0;

    let expectedAvailableCash = 0;
    let expectedReceivables = 0;
    let expectedInventoryValue = 0;
    let expectedPayables = 0;

    holders.forEach((h) => {
      // 1. Skip future upcoming payments from active capital totals
      if (h.category === 'upcoming' || h.isUpcoming) {
        upcomingPayments += h.expectedBalance; // Track sum of expected upcoming debit payments
        return;
      }

      // 2. Map standard active categories based on colors and names
      if (h.color === 'blue') {
        // Exclude Guangzhou/China Office from available cash, include in receivables
        if (h.name.toLowerCase().includes('china') || h.name.toLowerCase().includes('guangzhou')) {
          receivables += h.actualBalance;
          expectedReceivables += h.expectedBalance;
        } else {
          availableCash += h.actualBalance;
          expectedAvailableCash += h.expectedBalance;
        }
      } else if (h.color === 'green') {
        receivables += h.actualBalance;
        expectedReceivables += h.expectedBalance;
      } else if (h.color === 'orange') {
        inventoryValue += h.actualBalance;
        expectedInventoryValue += h.expectedBalance;
      } else if (h.color === 'red') {
        payables += h.actualBalance;
        expectedPayables += h.expectedBalance;
      }
    });

    // Total Wealth = Available Cash + Receivables + Inventory Value - Payables (Current debts)
    const totalWealth = availableCash + receivables + inventoryValue - payables;
    const expectedTotalWealth = expectedAvailableCash + expectedReceivables + expectedInventoryValue - expectedPayables;

    const metrics: DashboardMetrics = {
      totalWealth,
      availableCash,
      inventoryValue,
      receivables,
      payables,
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
