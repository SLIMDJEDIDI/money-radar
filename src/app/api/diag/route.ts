import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
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
  // Redact credentials but expose host+path so we can tell which DB we hit.
  let dbUrlHost: string | null = null;
  try {
    const u = new URL(process.env.DATABASE_URL || '');
    dbUrlHost = `${u.hostname}:${u.port}${u.pathname}`;
  } catch {}

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
  return NextResponse.json({ dbUrlPresent, dbUrlHost, aws0Snapshot, hubTables, results });
}
