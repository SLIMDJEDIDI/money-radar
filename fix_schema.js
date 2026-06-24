const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://postgres.cfbythrebgfgvydzgkgj:REDACTED_DB_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:5432/postgres" }
  }
});

async function fix() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "HubReminder" ADD COLUMN IF NOT EXISTS "reminderEmail" TEXT;`);
    console.log('reminderEmail OK');
    await prisma.$executeRawUnsafe(`ALTER TABLE "HubReminder" ADD COLUMN IF NOT EXISTS "lastNotifiedAt" TIMESTAMP(3);`);
    console.log('lastNotifiedAt OK');
    console.log('DONE - schema fixed');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}
fix();
