import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const revalidate = 0;
export const runtime = 'nodejs';

const prisma: PrismaClient = (globalThis as any).__poaPrisma ||
  ((globalThis as any).__poaPrisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL }));

export async function GET() {
  // SAFETY 1 — must be the correct Supabase project
  let projectRef: string | null = null;
  try {
    const u = new URL(process.env.DATABASE_URL || '');
    const m = u.username.match(/^postgres\.([a-z0-9]+)$/);
    if (m) projectRef = m[1];
  } catch {}
  if (projectRef !== 'dzhtkakwudqiosprvbzc') {
    return NextResponse.json({ ok: false, error: `Wrong DB project ref: ${projectRef}` }, { status: 400 });
  }

  // SAFETY 2 — ff and ss MUST exist as admins before we delete anything
  const [ff, ss, oldAdmin] = await Promise.all([
    prisma.hubUser.findUnique({ where: { username: 'ff' } }),
    prisma.hubUser.findUnique({ where: { username: 'ss' } }),
    prisma.hubUser.findUnique({ where: { username: 'admin' } }),
  ]);
  if (!ff || ff.role !== 'admin') return NextResponse.json({ ok: false, error: 'ff missing or not admin — refusing' }, { status: 400 });
  if (!ss || ss.role !== 'admin') return NextResponse.json({ ok: false, error: 'ss missing or not admin — refusing' }, { status: 400 });
  if (!oldAdmin) return NextResponse.json({ ok: true, note: 'old admin already removed', deleted: false });

  // SAFETY 3 — at least 2 other admins remain
  const adminCount = await prisma.hubUser.count({ where: { role: 'admin' } });
  if (adminCount < 3) return NextResponse.json({ ok: false, error: `Only ${adminCount} admins — refusing to delete` }, { status: 400 });

  // DELETE
  await prisma.hubUser.delete({ where: { id: oldAdmin.id } });

  // Also log to audit trail
  await prisma.hubAuditTrail.create({
    data: {
      entityType: 'USER',
      entityId: oldAdmin.id,
      action: 'DELETE_LEGACY_ADMIN',
      details: `Legacy 'admin' account removed after ff+ss owner accounts verified`,
      modifiedBy: 'system',
    },
  }).catch(() => {});

  const remaining = await prisma.hubUser.findMany({
    select: { username: true, role: true },
    orderBy: { username: 'asc' },
  });
  return NextResponse.json({ ok: true, deleted: true, deletedId: oldAdmin.id, remaining });
}
