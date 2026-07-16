const { PrismaClient } = require('@prisma/client');

const AWS1 = 'postgresql://postgres.cfbythrebgfgvydzgkgj:REDACTED@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10';

const p = new PrismaClient({ datasourceUrl: AWS1 });

(async () => {
  console.log('===== DB aws-1 =====');
  const contacts = await p.hubContact.findMany();
  const tx = await p.hubTransaction.findMany({ orderBy: { createdAt: 'desc' } });
  const reminders = await p.hubReminder.findMany();
  const tnd = await p.hubTndMovement.findMany({ orderBy: { createdAt: 'desc' } });
  const audits = await p.hubAuditTrail.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });

  console.log(`Contacts: ${contacts.length}`);
  contacts.forEach(c => console.log(`  - ${c.name} | held=${c.heldBalanceUsd} recv=${c.receivableBalanceUsd} pay=${c.payableBalanceUsd} | archived=${c.isArchived}`));

  console.log(`\nTransactions: ${tx.length}`);
  tx.slice(0, 10).forEach(t => console.log(`  - ${t.createdAt.toISOString()} | ${t.type} | ${t.amount} ${t.currencyCode} | contact=${t.contactId} | note=${(t.note||'').substring(0,40)}`));

  console.log(`\nReminders: ${reminders.length}`);
  console.log(`TND movements: ${tnd.length}`);
  tnd.slice(0, 5).forEach(m => console.log(`  - ${m.createdAt.toISOString()} | ${m.type} ${m.amount} | ${(m.note||'').substring(0,40)}`));

  console.log(`\nRecent audits: ${audits.length}`);
  audits.slice(0, 15).forEach(a => console.log(`  - ${a.createdAt.toISOString()} | ${a.actionType} | ${a.entityType} | by ${a.modifiedBy}`));

  await p.$disconnect();
})().catch(async e => { console.error('FAIL:', e.message); await p.$disconnect(); process.exit(1); });
