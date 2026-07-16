import { PrismaClient } from '@prisma/client';

// Pin the DB to aws-1 pooler where the up-to-date schema (incl. HubTndMovement) lives.
// A stale DATABASE_URL on Vercel currently points at aws-0 which is missing the new table,
// so we hardcode aws-1 until the Vercel env var is rotated.
// TODO: rotate DB password and restore process.env.DATABASE_URL as the primary source.
const PINNED_DATABASE_URL =
  'postgresql://postgres.cfbythrebgfgvydzgkgj:REDACTED_DB_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10';

const DATABASE_URL = PINNED_DATABASE_URL;

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: DATABASE_URL,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
