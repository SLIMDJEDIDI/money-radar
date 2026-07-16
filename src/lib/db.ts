import { PrismaClient } from '@prisma/client';

// ================================================================
// SAFETY GATE — Money Hub MUST connect ONLY to the isolated
// `money-hub-prod` Supabase project. Never fall back to any other
// database (learned the hard way: 2026-07-09 isolation decision).
// The project ref for money-hub-prod must appear in the URL.
// ================================================================
const MONEY_HUB_PROJECT_REF = 'MONEY_HUB_PROJECT_REF'; // set via env
const CARPET_DB_REF = 'cfbythrebgfgvydzgkgj';           // FORBIDDEN

function buildDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || process.env.MONEY_HUB_DATABASE_URL || '';
  if (!url) {
    throw new Error(
      'DATABASE_URL missing. Money Hub requires the connection string of the ' +
      '`money-hub-prod` Supabase project. Set MONEY_HUB_DATABASE_URL in Vercel.'
    );
  }
  if (url.includes(CARPET_DB_REF)) {
    throw new Error(
      'REFUSED: DATABASE_URL points at carpet-db. Money Hub must ONLY use money-hub-prod.'
    );
  }
  return url;
}

const DATABASE_URL = buildDatabaseUrl();

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: DATABASE_URL,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
