const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Money Radar data...');

  // Clean existing database
  await prisma.moneyMovement.deleteMany({});
  await prisma.moneyHolder.deleteMany({});

  // 1. Create Money Holders
  const cashTunisia = await prisma.moneyHolder.create({
    data: {
      name: 'Cash Tunisia',
      emoji: '💵',
      color: 'blue',
      expectedBalance: 15200,
      actualBalance: 15200,
    },
  });

  const bankTunisia = await prisma.moneyHolder.create({
    data: {
      name: 'Bank Tunisia',
      emoji: '🏦',
      color: 'blue',
      expectedBalance: 42000,
      actualBalance: 42000,
    },
  });

  const chinaOffice = await prisma.moneyHolder.create({
    data: {
      name: 'China Office',
      emoji: '🇨🇳',
      color: 'blue',
      expectedBalance: 85000,
      actualBalance: 85000,
    },
  });

  const wise = await prisma.moneyHolder.create({
    data: {
      name: 'Wise',
      emoji: '💳',
      color: 'blue',
      expectedBalance: 12500,
      actualBalance: 12500,
    },
  });

  const ahmed = await prisma.moneyHolder.create({
    data: {
      name: 'Ahmed',
      emoji: '🤝',
      color: 'green', // money owed to you
      expectedBalance: 25000,
      actualBalance: 23000, // actual count
    },
  });

  const brother = await prisma.moneyHolder.create({
    data: {
      name: 'Brother',
      emoji: '🤝',
      color: 'green', // money owed to you
      expectedBalance: 55000,
      actualBalance: 55000,
    },
  });

  const goodsInTransit = await prisma.moneyHolder.create({
    data: {
      name: 'Goods In Transit',
      emoji: '🚢',
      color: 'orange', // inventory
      expectedBalance: 252820,
      actualBalance: 252820,
      isSpecialTransit: true,
    },
  });

  const factory = await prisma.moneyHolder.create({
    data: {
      name: 'Factory Advances',
      emoji: '🏭',
      color: 'orange', // inventory/goods
      expectedBalance: 0,
      actualBalance: 0,
    },
  });

  const customerDeposits = await prisma.moneyHolder.create({
    data: {
      name: 'Customer Deposits',
      emoji: '👥',
      color: 'red', // money you owe
      expectedBalance: 0,
      actualBalance: 0,
    },
  });

  const supplierAdvances = await prisma.moneyHolder.create({
    data: {
      name: 'Supplier Advances',
      emoji: '💸',
      color: 'red', // money you owe / advanced from suppliers
      expectedBalance: 0,
      actualBalance: 0,
    },
  });

  console.log('Money Holders seeded successfully.');

  // 2. Create Sample Movements for Timeline (e.g. on Ahmed's account)
  // Let's create some movements for Ahmed
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  await prisma.moneyMovement.create({
    data: {
      amount: 2000,
      currency: 'USD',
      amountInUsd: 2000,
      fromHolderId: ahmed.id, // from Ahmed (Ahmed returned money)
      toHolderId: cashTunisia.id, // to Cash Tunisia
      note: 'Returned',
      createdAt: threeDaysAgo,
    },
  });

  const today = new Date();
  await prisma.moneyMovement.create({
    data: {
      amount: 5000,
      currency: 'USD',
      amountInUsd: 5000,
      fromHolderId: cashTunisia.id, // from Cash Tunisia (Gave Ahmed money)
      toHolderId: ahmed.id, // to Ahmed
      note: 'Cash given',
      createdAt: today,
    },
  });

  console.log('Sample movements seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
