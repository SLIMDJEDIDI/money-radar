const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasourceUrl: 'postgresql://postgres.cfbythrebgfgvydzgkgj:REDACTED@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10' });
(async () => {
  const r = await p.$queryRawUnsafe(`SELECT table_schema, table_name FROM information_schema.tables WHERE table_name ILIKE 'hubtndmovement';`);
  console.log('MATCHING TABLES:', JSON.stringify(r));
  const r2 = await p.$queryRawUnsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'Hub%' ORDER BY table_name;`);
  console.log('ALL HUB TABLES:', JSON.stringify(r2));
  await p.$disconnect();
})();
