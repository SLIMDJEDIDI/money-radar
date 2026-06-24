const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.cfbythrebgfgvydzgkgj:REDACTED_DB_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"
    }
  }
});

async function test() {
  try {
    const reminders = await prisma.hubReminder.findMany({ take: 1 });
    console.log('Reminders schema OK:', reminders);
  } catch (err) {
    console.error('Schema Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
