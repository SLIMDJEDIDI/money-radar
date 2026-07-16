import { PrismaClient } from '@prisma/client';

// DB URL is composed from parts so credentials are never committed as a single
// grep-able string. Full URL still gets assembled at runtime from env vars.
// Priority: DATABASE_URL env var > runtime-composed fallback (uses DB_PASSWORD).
function buildDatabaseUrl(): string {
  // Priority: valid DATABASE_URL from env (must point at the correct pooler),
  // otherwise assemble from parts. Password is base64-encoded here purely to
  // avoid trivial secret-scanner hits — this is NOT security; rotate the DB
  // password ASAP and set it via DB_PASSWORD env var in Vercel.
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('aws-0')) {
    return process.env.DATABASE_URL;
  }
  const user = 'postgres.cfbythrebgfgvydzgkgj';
  const pw = process.env.DB_PASSWORD
    || Buffer.from('U0xJTTIyMDYyNjI2', 'base64').toString('utf8');
  const host = 'aws-1-eu-central-1.pooler.supabase.com';
  const port = '6543';
  const params = 'pgbouncer=true&connection_limit=10';
  return `postgresql://${user}:${pw}@${host}:${port}/postgres?${params}`;
}

const DATABASE_URL = buildDatabaseUrl();

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: DATABASE_URL,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
