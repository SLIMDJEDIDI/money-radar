import { prisma } from '../lib/db';

// Core currency conversion rates to USD (base currency)
const CURRENCY_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,
  TND: 0.32,
};

export interface HolderSummary {
  id: string;
  name: string;
  emoji: string;
  color: string; // "green" | "blue" | "orange" | "red"
  expectedBalance: number;
  actualBalance: number;
  difference: number;
  isSpecialTransit: boolean;
}

export interface DashboardMetrics {
  totalWealth: number;
  availableCash: number;
  inventoryValue: number;
  receivables: number;
  expectedTotalWealth: number;
}

// 1. Fetch all money holders and calculate metrics (No 'use server' - safe for direct RSC render!)
export async function getDashboardData(searchQuery: string = '') {
  try {
    const holders = await prisma.moneyHolder.findMany({
      orderBy: { name: 'asc' },
    });

    const formattedHolders: HolderSummary[] = holders.map((h) => {
      const diff = h.actualBalance - h.expectedBalance;
      return {
        id: h.id,
        name: h.name,
        emoji: h.emoji || '💵',
        color: h.color || 'blue',
        expectedBalance: h.expectedBalance,
        actualBalance: h.actualBalance,
        difference: diff,
        isSpecialTransit: h.isSpecialTransit,
      };
    });

    // Filtering logic (if searched)
    const filteredHolders = formattedHolders.filter((h) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        h.name.toLowerCase().includes(q) ||
        h.emoji.includes(q) ||
        h.color.toLowerCase().includes(q)
      );
    });

    // Calculate Dashboard Metrics
    let availableCash = 0;
    let receivables = 0;
    let inventoryValue = 0;
    let payables = 0;

    let expectedAvailableCash = 0;
    let expectedReceivables = 0;
    let expectedInventoryValue = 0;
    let expectedPayables = 0;

    holders.forEach((h) => {
      if (h.color === 'blue') {
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

    const totalWealth = availableCash + receivables + inventoryValue - payables;
    const expectedTotalWealth = expectedAvailableCash + expectedReceivables + expectedInventoryValue - expectedPayables;

    const metrics: DashboardMetrics = {
      totalWealth,
      availableCash,
      inventoryValue,
      receivables,
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
      holder,
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
