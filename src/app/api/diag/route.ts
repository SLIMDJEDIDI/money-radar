import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

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

  // ONE-SHOT MIGRATION — safe idempotent ALTER TABLE (adds scheduled/settled columns to TND)
  // Non-destructive: ADD COLUMN IF NOT EXISTS, DEFAULT preserves existing rows.
  let migration: unknown = null;
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "HubTndMovement" ADD COLUMN IF NOT EXISTS "scheduledFor" TIMESTAMP(3);`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "HubTndMovement" ADD COLUMN IF NOT EXISTS "isSettled" BOOLEAN NOT NULL DEFAULT true;`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubTndMovement_scheduledFor_idx" ON "HubTndMovement"("scheduledFor");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubTndMovement_isSettled_idx" ON "HubTndMovement"("isSettled");`);
    const cols = await prisma.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = 'HubTndMovement' ORDER BY column_name;`);
    migration = { ok: true, columns: cols };
  } catch (e: any) {
    migration = { ok: false, error: String(e?.message || e).slice(0, 300) };
  }

  return NextResponse.json({ dbUrlPresent, dbUrlProjectRef, migration, results });
}
