const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres.cfbythrebgfgvydzgkgj:REDACTED_DB_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:5432/postgres' } }
});

async function run() {
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "HubTndMovement" (
      id TEXT PRIMARY KEY,
      amount FLOAT NOT NULL,
      type TEXT NOT NULL,
      note TEXT NOT NULL,
      "performedBy" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  console.log('HubTndMovement table ready');
  await prisma.$disconnect();
}

run().catch(e => { console.error(e.message); process.exit(1); });
