import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const revalidate = 0;
export const runtime = 'nodejs';

// Read-only diagnostic endpoint. Uses its own Prisma client (bypasses lib/db safety gate).
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
  let dbUrlHost: string | null = null;
  let dbUrlProjectRef: string | null = null;
  try {
    const u = new URL(process.env.DATABASE_URL || '');
    dbUrlHost = `${u.hostname}:${u.port}${u.pathname}`;
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

  // Also expose users (username + role only, no hashes) to audit RBAC config
  let users: unknown = null;
  try {
    users = await prisma.hubUser.findMany({
      select: { id: true, username: true, role: true, createdAt: true },
      orderBy: { username: 'asc' },
    });
  } catch (e: any) {
    users = { error: String(e?.message || e).slice(0, 200) };
  }

  return NextResponse.json({ dbUrlPresent, dbUrlHost, dbUrlProjectRef, users, results });
}
