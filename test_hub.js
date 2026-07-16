const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres.cfbythrebgfgvydzgkgj:REDACTED_DB_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:5432/postgres' } } });
(async () => {
  try {
    const currencies = await p.hubCurrency.findMany();
    console.log('Currencies:', currencies.map(c => c.code));
    const users = await p.hubUser.findMany({ select: { username: true, role: true } });
    console.log('Users:', users);
    const contacts = await p.hubContact.count();
    console.log('Contacts:', contacts);
    console.log('ALL OK');
  } catch(e) { console.error('ERROR:', e.message); }
  await p.$disconnect();
})();
