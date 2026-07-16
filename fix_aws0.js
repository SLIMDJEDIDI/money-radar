const { PrismaClient } = require('@prisma/client');

// Vercel is using aws-0, not aws-1. Create the table on the correct DB.
const URL_AWS0 = 'postgresql://postgres.cfbythrebgfgvydzgkgj:REDACTED@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10';

const p = new PrismaClient({ datasourceUrl: URL_AWS0 });

(async () => {
  console.log('Connecting to aws-0 pooler...');
  const before = await p.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'Hub%' ORDER BY 1;`
  );
  console.log('BEFORE - Hub tables:', JSON.stringify(before));

  console.log('Creating HubTndMovement...');
  await p.$executeRawUnsafe(`
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
  await p.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubTndMovement_createdAt_idx" ON "HubTndMovement"("createdAt");`);
  await p.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HubTndMovement_type_idx" ON "HubTndMovement"("type");`);

  const rows = await p.hubTndMovement.findMany();
  console.log(`AFTER - HubTndMovement row count: ${rows.length}`);
  await p.$disconnect();
  console.log('DONE');
})().catch(async (e) => { console.error('FAIL:', e); await p.$disconnect(); process.exit(1); });
