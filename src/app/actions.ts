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

// 2. Reconcile expected vs actual balance
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
