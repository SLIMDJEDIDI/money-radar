const { PrismaClient } = require('@prisma/client');

const DATABASE_URL = 'postgresql://postgres.cfbythrebgfgvydzgkgj:REDACTED@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10';

const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL });

async function main() {
  console.log('Creating HubTndMovement table if missing...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HubTndMovement" (
      "id"          TEXT PRIMARY KEY,
      "amount"      DOUBLE PRECISION NOT NULL,
      "type"        TEXT NOT NULL,
      "note"        TEXT NOT NULL,
      "performedBy" TEXT NOT NULL,
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubTndMovement_createdAt_idx" ON "HubTndMovement"("createdAt");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubTndMovement_type_idx" ON "HubTndMovement"("type");`);
  console.log('Table + indexes ready.');

  const rows = await prisma.hubTndMovement.findMany();
  console.log(`Row count: ${rows.length}`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error('FAIL:', e); await prisma.$disconnect(); process.exit(1); });
