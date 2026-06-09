'use server';

import { prisma } from '../lib/db';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

// Stable currency conversion rates to USD (base currency)
const CURRENCY_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,
  TND: 0.32,
};

// Helper function to re-calculate a Holder's aggregated USD balances
async function recalculateHolderUsdBalances(tx: any, holderId: string) {
  const balances = await tx.holderBalance.findMany({
    where: { holderId },
  });

  let totalExpectedUsd = 0;
  let totalActualUsd = 0;

  balances.forEach((b: any) => {
    const rate = CURRENCY_RATES[b.currency] || 1.0;
    totalExpectedUsd += b.expectedBalance * rate;
    totalActualUsd += b.actualBalance * rate;
  });

  await tx.moneyHolder.update({
    where: { id: holderId },
    data: {
      expectedBalance: totalExpectedUsd,
      actualBalance: totalActualUsd,
    },
  });
}

// 1. Create Money Movement (+Movement or Transfer)
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

    const rate = CURRENCY_RATES[currency] || 1.0;
    const amountInUsd = amount * rate;

    // Handle photo attachment proof
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

    // Run in transaction to maintain multi-currency balance integrity
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

      // 2. Deduct from Source Holder's currency balance
      if (fromHolderId && fromHolderId !== 'external') {
        // Find or create the sub-balance for this specific currency
        const fromBalance = await tx.holderBalance.upsert({
          where: {
            holderId_currency: { holderId: fromHolderId, currency },
          },
          update: {
            expectedBalance: { decrement: amount },
            actualBalance: { decrement: amount },
          },
          create: {
            holderId: fromHolderId,
            currency,
            expectedBalance: -amount,
            actualBalance: -amount,
          },
        });

        // Recalculate parent aggregated USD balances
        await recalculateHolderUsdBalances(tx, fromHolderId);
      }

      // 3. Add to Destination Holder's currency balance
      if (toHolderId && toHolderId !== 'external') {
        // Find or create the sub-balance for this specific currency
        await tx.holderBalance.upsert({
          where: {
            holderId_currency: { holderId: toHolderId, currency },
          },
          update: {
            expectedBalance: { increment: amount },
            actualBalance: { increment: amount },
          },
          create: {
            holderId: toHolderId,
            currency,
            expectedBalance: amount,
            actualBalance: amount,
          },
        });

        // Recalculate parent aggregated USD balances
        await recalculateHolderUsdBalances(tx, toHolderId);
      }
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to create movement:', error);
    return { success: false, error: error.message || 'Database operation failed' };
  }
}

// 2. Reconcile expected vs actual balance for a specific currency
export async function reconcileHolder(holderId: string, currency: string, actualBalance: number) {
  try {
    if (isNaN(actualBalance)) {
      return { success: false, error: 'Invalid actual count' };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Find or create the sub-balance for this specific currency being reconciled
      const existingBalance = await tx.holderBalance.findUnique({
        where: {
          holderId_currency: { holderId, currency },
        },
      });

      if (existingBalance) {
        await tx.holderBalance.update({
          where: { id: existingBalance.id },
          data: { actualBalance },
        });
      } else {
        // If they enter actual count for a currency that didn't have entries, create it with 0 expected
        await tx.holderBalance.create({
          data: {
            holderId,
            currency,
            expectedBalance: 0,
            actualBalance,
          },
        });
      }

      // 2. Recalculate the parent aggregated USD balances
      await recalculateHolderUsdBalances(tx, holderId);
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to reconcile holder:', error);
    return { success: false, error: error.message || 'Failed to update balance' };
  }
}

// 3. Create a dynamic Money Holder / Partner / Upcoming Debit account
export async function createHolder(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const emoji = (formData.get('emoji') as string) || '💵';
    const color = (formData.get('color') as string) || 'blue';
    const category = (formData.get('category') as string) || 'holder';
    const partnerType = formData.get('partnerType') as string | null;
    const initialCurrency = (formData.get('initialCurrency') as string) || 'USD';
    const initialExpectedStr = (formData.get('initialExpected') as string) || '0';
    const initialActualStr = (formData.get('initialActual') as string) || '0';

    if (!name) {
      return { success: false, error: 'Name is required' };
    }

    const initialExpected = parseFloat(initialExpectedStr);
    const initialActual = parseFloat(initialActualStr);
    const rate = CURRENCY_RATES[initialCurrency] || 1.0;

    const expectedBalanceUsd = initialExpected * rate;
    const actualBalanceUsd = initialActual * rate;

    await prisma.$transaction(async (tx) => {
      // 1. Create the MoneyHolder record
      const holder = await tx.moneyHolder.create({
        data: {
          name,
          emoji,
          color,
          category,
          partnerType: category === 'partner' ? partnerType : null,
          isUpcoming: category === 'upcoming',
          expectedBalance: expectedBalanceUsd,
          actualBalance: actualBalanceUsd,
        },
      });

      // 2. Create the initial currency balance record
      await tx.holderBalance.create({
        data: {
          holderId: holder.id,
          currency: initialCurrency,
          expectedBalance: initialExpected,
          actualBalance: initialActual,
        },
      });
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to create holder:', error);
    if (error.code === 'P2002') {
      return { success: false, error: 'An account with this name already exists.' };
    }
    return { success: false, error: error.message || 'Failed to create account' };
  }
}
