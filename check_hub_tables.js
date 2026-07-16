const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres.cfbythrebgfgvydzgkgj:REDACTED_DB_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:5432/postgres' } }
});

async function run() {
  try {
    const c = await prisma.hubContact.count();
    console.log('HubContact count:', c);
  } catch (e) { console.error('HubContact:', e.message); }
  
  try {
    const u = await prisma.hubUser.count();
    console.log('HubUser count:', u);
  } catch (e) { console.error('HubUser:', e.message); }
  
  try {
    const t = await prisma.hubTransaction.count();
    console.log('HubTransaction count:', t);
  } catch (e) { console.error('HubTransaction:', e.message); }
  
  try {
    const r = await prisma.hubReminder.count();
    console.log('HubReminder count:', r);
  } catch (e) { console.error('HubReminder:', e.message); }
  
  try {
    const a = await prisma.hubAuditTrail.count();
    console.log('HubAuditTrail count:', a);
  } catch (e) { console.error('HubAuditTrail:', e.message); }
  
  await prisma.$disconnect();
}
run();
