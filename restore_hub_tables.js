const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres.cfbythrebgfgvydzgkgj:REDACTED_DB_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:5432/postgres' } }
});

async function run() {
  console.log('Restoring Hub tables...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HubCurrency" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      code TEXT NOT NULL UNIQUE,
      symbol TEXT NOT NULL,
      "rateToUsd" FLOAT NOT NULL DEFAULT 1.0,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('HubCurrency OK');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HubCategory" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL UNIQUE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('HubCategory OK');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HubUser" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      username TEXT NOT NULL UNIQUE,
      "passwordHash" TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'assistant',
      "canWrite" BOOLEAN NOT NULL DEFAULT true,
      "canEdit" BOOLEAN NOT NULL DEFAULT false,
      "canDelete" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('HubUser OK');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HubContact" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '👤',
      country TEXT,
      "isArchived" BOOLEAN NOT NULL DEFAULT false,
      "heldBalanceUsd" FLOAT NOT NULL DEFAULT 0,
      "receivableBalanceUsd" FLOAT NOT NULL DEFAULT 0,
      "payableBalanceUsd" FLOAT NOT NULL DEFAULT 0,
      "netPositionUsd" FLOAT NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('HubContact OK');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HubTransaction" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      amount FLOAT NOT NULL,
      "currencyCode" TEXT NOT NULL DEFAULT 'USD',
      "amountInUsd" FLOAT NOT NULL,
      "contactId" TEXT NOT NULL REFERENCES "HubContact"(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Virement',
      note TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('HubTransaction OK');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HubReminder" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      amount FLOAT NOT NULL,
      "currencyCode" TEXT NOT NULL DEFAULT 'USD',
      "amountInUsd" FLOAT NOT NULL,
      "contactId" TEXT NOT NULL REFERENCES "HubContact"(id) ON DELETE CASCADE,
      "dueDate" TIMESTAMP(3) NOT NULL,
      note TEXT,
      "reminderEmail" TEXT,
      "lastNotifiedAt" TIMESTAMP(3),
      "isCompleted" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('HubReminder OK');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HubAuditTrail" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT,
      action TEXT NOT NULL,
      "oldValue" TEXT,
      "newValue" TEXT,
      details TEXT,
      "modifiedBy" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('HubAuditTrail OK');

  // Seed default admin user (password: admin123 — user should change this)
  const { scryptSync, randomBytes } = require('crypto');
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync('admin123', salt, 64).toString('hex');
  const passwordHash = `scrypt$${salt}$${hash}`;
  
  await prisma.$executeRawUnsafe(`
    INSERT INTO "HubUser" (id, username, "passwordHash", role, "canWrite", "canEdit", "canDelete")
    VALUES (gen_random_uuid()::text, 'admin', $1, 'admin', true, true, true)
    ON CONFLICT (username) DO NOTHING
  `, passwordHash);
  console.log('Admin user seeded (password: admin123) — CHANGE IT IMMEDIATELY');

  // Seed default currencies
  await prisma.$executeRawUnsafe(`
    INSERT INTO "HubCurrency" (id, code, symbol, "rateToUsd", "isActive")
    VALUES 
      (gen_random_uuid()::text, 'USD', '$', 1.0, true),
      (gen_random_uuid()::text, 'RMB', '¥', 0.14, true),
      (gen_random_uuid()::text, 'EURO', '€', 1.08, true),
      (gen_random_uuid()::text, 'TND', 'DT', 0.32, true)
    ON CONFLICT (code) DO NOTHING
  `);
  console.log('Currencies seeded');

  // Seed default categories
  await prisma.$executeRawUnsafe(`
    INSERT INTO "HubCategory" (id, name) VALUES
      (gen_random_uuid()::text, 'Virement'),
      (gen_random_uuid()::text, 'Espèces'),
      (gen_random_uuid()::text, 'Chèque'),
      (gen_random_uuid()::text, 'Autre')
    ON CONFLICT (name) DO NOTHING
  `);
  console.log('Categories seeded');

  console.log('\n✅ All Hub tables restored and seeded successfully!');
  await prisma.$disconnect();
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
