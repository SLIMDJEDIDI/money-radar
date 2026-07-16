import { PrismaClient } from '@prisma/client';

// Fallback DATABASE_URL embedded so the app boots even if the Vercel project
// has no env var configured. Overridden by process.env.DATABASE_URL when set.
// TODO: move to Vercel env vars and rotate this DB password.
const FALLBACK_DATABASE_URL =
  'postgresql://postgres.cfbythrebgfgvydzgkgj:REDACTED_DB_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10';

const DATABASE_URL = process.env.DATABASE_URL || FALLBACK_DATABASE_URL;

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: DATABASE_URL,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
