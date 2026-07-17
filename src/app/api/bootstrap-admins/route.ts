import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { scryptSync, randomBytes } from 'crypto';

export const revalidate = 0;
export const runtime = 'nodejs';

const prisma: PrismaClient = (globalThis as any).__bsPrisma ||
  ((globalThis as any).__bsPrisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL }));

function hashPw(pw: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(pw, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export async function GET() {
  // SAFETY GATE — refuse to run against wrong Supabase project.
  let projectRef: string | null = null;
  try {
    const u = new URL(process.env.DATABASE_URL || '');
    const m = u.username.match(/^postgres\.([a-z0-9]+)$/);
    if (m) projectRef = m[1];
  } catch {}
  if (projectRef !== 'dzhtkakwudqiosprvbzc') {
    return NextResponse.json({ ok: false, error: `Wrong DB project ref: ${projectRef}` }, { status: 400 });
  }

  const spec: Array<{ username: string; password: string; role: string }> = [
    { username: 'ff', password: 'REDACTED_A',     role: 'admin' },
    { username: 'ss', password: 'REDACTED_B', role: 'admin' },
  ];

  const results: any[] = [];
  for (const u of spec) {
    try {
      const existing = await prisma.hubUser.findUnique({ where: { username: u.username } });
      if (existing) {
        // Update password + ensure admin role
        await prisma.hubUser.update({
          where: { id: existing.id },
          data: { passwordHash: hashPw(u.password), role: 'admin' },
        });
        results.push({ username: u.username, action: 'updated', id: existing.id });
      } else {
        const created = await prisma.hubUser.create({
          data: { username: u.username, passwordHash: hashPw(u.password), role: 'admin' },
        });
        results.push({ username: u.username, action: 'created', id: created.id });
      }
    } catch (e: any) {
      results.push({ username: u.username, action: 'failed', error: String(e?.message || e).slice(0, 200) });
    }
  }

  // Final state
  const allAdmins = await prisma.hubUser.findMany({
    where: { role: 'admin' },
    select: { username: true, role: true, createdAt: true },
    orderBy: { username: 'asc' },
  });

  return NextResponse.json({ ok: true, projectRef, results, admins: allAdmins });
}
