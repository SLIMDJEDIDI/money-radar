import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export const revalidate = 0;
export const runtime = 'nodejs';

async function safe<T>(label: string, fn: () => Promise<T>): Promise<{ label: string; ok: boolean; count?: number; error?: string }> {
  try {
    const r = await fn();
    const count = Array.isArray(r) ? r.length : (typeof r === 'number' ? r : 0);
    return { label, ok: true, count };
  } catch (e: any) {
    return { label, ok: false, error: String(e?.message || e).slice(0, 500) };
  }
}

export async function GET() {
  const dbUrlPresent = !!process.env.DATABASE_URL;
  const results = await Promise.all([
    safe('HubCurrency', () => prisma.hubCurrency.findMany()),
    safe('HubCategory', () => prisma.hubCategory.findMany()),
    safe('HubContact', () => prisma.hubContact.findMany()),
    safe('HubTransaction', () => prisma.hubTransaction.findMany({ include: { contact: true }, take: 5 })),
    safe('HubReminder', () => prisma.hubReminder.findMany({ include: { contact: true }, take: 5 })),
    safe('HubAuditTrail', () => prisma.hubAuditTrail.findMany({ take: 5 })),
    safe('HubUser', () => prisma.hubUser.findMany({ select: { id: true, username: true, role: true, canWrite: true, canEdit: true, canDelete: true, createdAt: true } })),
    safe('HubTndMovement', () => prisma.hubTndMovement.findMany({ take: 5 })),
  ]);
  return NextResponse.json({ dbUrlPresent, results });
}
