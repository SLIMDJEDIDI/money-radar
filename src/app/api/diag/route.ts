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
  return NextResponse.json({ dbUrlPresent, dbUrlHost, hubTables, results });
}
