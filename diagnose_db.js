const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres.cfbythrebgfgvydzgkgj:REDACTED_DB_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:5432/postgres' } }
});

async function run() {
  // Check if HubTndMovement table exists
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
  `;
  console.log('Tables:', tables.map((t) => t.tablename).join(', '));

  // Check columns on HubTndMovement
  const cols = await prisma.$queryRaw`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name='HubTndMovement' ORDER BY ordinal_position;
  `;
  console.log('HubTndMovement columns:', cols.length ? cols : 'TABLE NOT FOUND');

  // Try a direct query
  try {
    const count = await prisma.hubTndMovement.count();
    console.log('hubTndMovement.count() =', count);
  } catch (e) {
    console.error('Prisma query failed:', e.message);
  }

  await prisma.$disconnect();
}

run();
