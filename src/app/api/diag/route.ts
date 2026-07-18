import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getPanicLockState, getSession } from '../../../lib/auth';

export const revalidate = 0;
export const runtime = 'nodejs';

// Minimal read-only diagnostic: just confirms DB reachability + counts.
// No user list, no RBAC probing (those were used ad-hoc, now removed).
const prisma: PrismaClient = (globalThis as any).__diagPrisma ||
  ((globalThis as any).__diagPrisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  }));

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
  // Never expose diagnostics during a global emergency lock.
  const [panic, session] = await Promise.all([getPanicLockState(), getSession()]);
  if (panic.isLocked) return NextResponse.json({ error: 'Panic Lock active' }, { status: 423 });
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUrlPresent = !!process.env.DATABASE_URL;
  let dbUrlProjectRef: string | null = null;
  try {
    const u = new URL(process.env.DATABASE_URL || '');
    const m = u.username.match(/^postgres\.([a-z0-9]+)$/);
    if (m) dbUrlProjectRef = m[1];
  } catch {}

  const results = await Promise.all([
    safe('HubCurrency', () => prisma.hubCurrency.count()),
    safe('HubCategory', () => prisma.hubCategory.count()),
    safe('HubContact', () => prisma.hubContact.count()),
    safe('HubTransaction', () => prisma.hubTransaction.count()),
    safe('HubReminder', () => prisma.hubReminder.count()),
    safe('HubAuditTrail', () => prisma.hubAuditTrail.count()),
    safe('HubUser', () => prisma.hubUser.count()),
    safe('HubTndMovement', () => prisma.hubTndMovement.count()),
  ]);

  return NextResponse.json({ dbUrlPresent, dbUrlProjectRef, results });
}
