import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const prisma: PrismaClient = (globalThis as any).__panicMigrationPrisma ||
  ((globalThis as any).__panicMigrationPrisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL }));

export async function GET() {
  // Hard safety gate: this migration is valid ONLY for Money Hub production.
  let projectRef: string | null = null;
  try {
    const url = new URL(process.env.DATABASE_URL || '');
    const match = url.username.match(/^postgres\.([a-z0-9]+)$/);
    if (match) projectRef = match[1];
  } catch {}
  if (projectRef !== 'dzhtkakwudqiosprvbzc') {
    return NextResponse.json({ ok: false, error: `Refused: unexpected DB project ${projectRef}` }, { status: 400 });
  }

  try {
    // Non-destructive, idempotent singleton state table.
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HubPanicLock" (
        "id" TEXT PRIMARY KEY,
        "isLocked" BOOLEAN NOT NULL DEFAULT false,
        "emergencyUsername" TEXT,
        "emergencyPasswordHash" TEXT,
        "lockedAt" TIMESTAMP(3),
        "lockedBy" TEXT,
        "lockEpoch" INTEGER NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubPanicLock_isLocked_idx" ON "HubPanicLock"("isLocked");`);
    await prisma.$executeRawUnsafe(`INSERT INTO "HubPanicLock" ("id") VALUES ('global') ON CONFLICT ("id") DO NOTHING;`);
    const lock = await prisma.hubPanicLock.findUnique({ where: { id: 'global' } });
    return NextResponse.json({ ok: true, projectRef, state: { isLocked: lock?.isLocked, lockEpoch: lock?.lockEpoch } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error?.message || error).slice(0, 300) }, { status: 500 });
  }
}
