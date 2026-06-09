'use server';

import { prisma } from '../lib/db';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

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

// 1. Fetch all money holders and calculate metrics
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

    // Calculate Dashboard Metrics based on the exact logic of the user's requests:
    // Available Cash = Tunisia Cash, Tunisia Bank, Wise (Blue, but excluding China/Guangzhou Office)
    // Receivables = Ahmed, Brother, China Office (Green, plus China Office as requested in widgets balance)
    // Inventory Value = Goods In Transit, Factory Advances (Orange)
    // Payables/Owed = Customer Deposits, Supplier Advances (Red)
    
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
        // Exclude China Office from available cash, include it in receivables as it's capital locked/owed
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

    // Total Wealth = Available Cash + Receivables + Inventory Value - Payables
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

// 2. Create Money Movement (+Movement or Transfer)
export async function createMovement(formData: FormData) {
  try {
    const amountStr = formData.get('amount') as string;
    const currency = (formData.get('currency') as string) || 'USD';
    const fromHolderId = formData.get('fromHolderId') as string | null;
    const toHolderId = formData.get('toHolderId') as string | null;
    const note = formData.get('note') as string | null;
    const photoFile = formData.get('photo') as File | null;

    if (!amountStr) {
      return { success: false, error: 'Amount is required' };
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Invalid amount' };
    }

    // Convert to USD base currency
    const rate = CURRENCY_RATES[currency] || 1.0;
    const amountInUsd = amount * rate;

    // Handle photo attachment
    let photoPath = null;
    if (photoFile && photoFile.name && photoFile.size > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const fileName = `${Date.now()}_${photoFile.name.replace(/\s+/g, '_')}`;
      const filePath = path.join(uploadDir, fileName);
      
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      photoPath = `/uploads/${fileName}`;
    }

    // Run in transaction to maintain balance consistency
    await prisma.$transaction(async (tx) => {
      // 1. Create the Movement record
      await tx.moneyMovement.create({
        data: {
          amount,
          currency,
          amountInUsd,
          fromHolderId: fromHolderId || null,
          toHolderId: toHolderId || null,
          note,
          photoPath,
        },
      });

      // 2. Deduct from Source Holder (if selected)
      if (fromHolderId && fromHolderId !== 'external') {
        const fromHolder = await tx.moneyHolder.findUnique({ where: { id: fromHolderId } });
        if (fromHolder) {
          await tx.moneyHolder.update({
            where: { id: fromHolderId },
            data: {
              expectedBalance: fromHolder.expectedBalance - amountInUsd,
              actualBalance: fromHolder.actualBalance - amountInUsd,
            },
          });
        }
      }

      // 3. Add to Destination Holder (if selected)
      if (toHolderId && toHolderId !== 'external') {
        const toHolder = await tx.moneyHolder.findUnique({ where: { id: toHolderId } });
        if (toHolder) {
          await tx.moneyHolder.update({
            where: { id: toHolderId },
            data: {
              expectedBalance: toHolder.expectedBalance + amountInUsd,
              actualBalance: toHolder.actualBalance + amountInUsd,
            },
          });
        }
      }
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to create movement:', error);
    return { success: false, error: 'Database operation failed' };
  }
}

// 3. Reconcile expected vs actual balance
export async function reconcileHolder(holderId: string, actualBalance: number) {
  try {
    await prisma.moneyHolder.update({
      where: { id: holderId },
      data: {
        actualBalance: actualBalance,
      },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to reconcile holder:', error);
    return { success: false, error: 'Failed to update balance' };
  }
}

// 4. Get individual Holder details, balance, and timeline
export async function getHolderDetails(holderId: string) {
  try {
    const holder = await prisma.moneyHolder.findUnique({
      where: { id: holderId },
    });

    if (!holder) {
      throw new Error('Holder not found');
    }

    // Get all movements involving this holder
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

// 5. Get recent movements for general search/timeline
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
