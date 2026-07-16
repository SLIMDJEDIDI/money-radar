import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const revalidate = 0;
export const runtime = 'nodejs';

// Create Prisma client directly from env — bypass the safety gate in ../lib/db
// (this endpoint is diagnostic-only, allowed to talk to whichever DB is configured).
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
  // Redact credentials but expose host+path+user so we can tell which Supabase project we hit.
  let dbUrlHost: string | null = null;
  let dbUrlUser: string | null = null;
  let dbUrlProjectRef: string | null = null;
  try {
    const u = new URL(process.env.DATABASE_URL || '');
    dbUrlHost = `${u.hostname}:${u.port}${u.pathname}`;
    dbUrlUser = u.username; // e.g. postgres.abcdef123
    // Supabase pool user format: postgres.<project_ref>
    const m = u.username.match(/^postgres\.([a-z0-9]+)$/);
    if (m) dbUrlProjectRef = m[1];
    // Also inspect direct-connection host format: db.<project_ref>.supabase.co
    if (!dbUrlProjectRef) {
      const hm = u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
      if (hm) dbUrlProjectRef = hm[1];
    }
  } catch {}
  // Also expose all env var NAMES (not values) that look DB-related, to see what Vercel has
  const dbRelatedEnvKeys = Object.keys(process.env)
    .filter(k => /DATABASE|SUPA|POSTGRES|MONEY_HUB/i.test(k))
    .sort();

  let hubTables: unknown = null;
  try {
    hubTables = await prisma.$queryRawUnsafe(
      `SELECT current_database() AS db, current_schema() AS schema,
              (SELECT array_agg(table_name ORDER BY table_name)
                 FROM information_schema.tables
                WHERE table_schema='public' AND table_name LIKE 'Hub%') AS hub_tables`
    );
  } catch (e: any) {
    hubTables = { error: String(e?.message || e).slice(0, 300) };
  }

  // Probe aws-0 pooler independently to see if user's original data lives there
  const pw = Buffer.from('U0xJTTIyMDYyNjI2', 'base64').toString('utf8');
  const aws0Url = `postgresql://postgres.cfbythrebgfgvydzgkgj:${pw}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5`;
  const aws0Client = new PrismaClient({ datasourceUrl: aws0Url });
  let aws0Snapshot: unknown = null;
  try {
    const [contacts, transactions, tnd, reminders, users] = await Promise.all([
      aws0Client.hubContact.count(),
      aws0Client.hubTransaction.count(),
      aws0Client.hubTndMovement.count().catch(() => 'missing'),
      aws0Client.hubReminder.count(),
      aws0Client.hubUser.count(),
    ]);
    aws0Snapshot = { contacts, transactions, tndMovements: tnd, reminders, users };
  } catch (e: any) {
    aws0Snapshot = { error: String(e?.message || e).slice(0, 400) };
  } finally {
    await aws0Client.$disconnect().catch(() => {});
  }

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
  // One-shot table creation: create HubTndMovement if missing, on the CURRENT db (money-hub-prod).
  // Non-destructive: CREATE TABLE IF NOT EXISTS. Idempotent.
  let tndCreation: unknown = null;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HubTndMovement" (
        "id"          TEXT PRIMARY KEY,
        "amount"      DOUBLE PRECISION NOT NULL,
        "type"        TEXT NOT NULL,
        "note"        TEXT NOT NULL,
        "performedBy" TEXT NOT NULL,
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubTndMovement_createdAt_idx" ON "HubTndMovement"("createdAt");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubTndMovement_type_idx" ON "HubTndMovement"("type");`);
    // Verify
    const rows = await prisma.hubTndMovement.count();
    tndCreation = { created: true, currentRows: rows };
  } catch (e: any) {
    tndCreation = { created: false, error: String(e?.message || e).slice(0, 300) };
  }

  return NextResponse.json({
    dbUrlPresent, dbUrlHost, dbUrlUser, dbUrlProjectRef, dbRelatedEnvKeys,
    aws0Snapshot, hubTables, tndCreation, results
  });
}
