const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Stable currency rates to USD
const CURRENCY_RATES = {
  USD: 1.0,
  EUR: 1.08,
  TND: 0.32,
};

async function main() {
  console.log('Seeding Multi-Currency Money Radar data...');

  // Clean existing database
  await prisma.moneyMovement.deleteMany({});
  await prisma.holderBalance.deleteMany({});
  await prisma.moneyHolder.deleteMany({});

  // 1. Create Your Own Wallets (category: "holder", color: "blue" or "orange" for transit)
  
  // Slim Cash Tunisia
  await prisma.moneyHolder.create({
    data: {
      name: 'Slim Cash',
      emoji: '💵',
      color: 'blue',
      category: 'holder',
      expectedBalance: 15200,
      actualBalance: 15200,
      balances: {
        create: [
          { currency: 'USD', expectedBalance: 15200, actualBalance: 15200 }
        ]
      }
    }
  });

  // Slim Bank Tunisia
  await prisma.moneyHolder.create({
    data: {
      name: 'Slim Bank',
      emoji: '🏦',
      color: 'blue',
      category: 'holder',
      expectedBalance: 42000,
      actualBalance: 42000,
      balances: {
        create: [
          { currency: 'USD', expectedBalance: 42000, actualBalance: 42000 }
        ]
      }
    }
  });

  // Wise
  await prisma.moneyHolder.create({
    data: {
      name: 'Wise',
      emoji: '💳',
      color: 'blue',
      category: 'holder',
      expectedBalance: 12500,
      actualBalance: 12500,
      balances: {
        create: [
          { currency: 'USD', expectedBalance: 12500, actualBalance: 12500 }
        ]
      }
    }
  });

  // Guangzhou Office
  await prisma.moneyHolder.create({
    data: {
      name: 'Guangzhou Office',
      emoji: '🇨🇳',
      color: 'blue',
      category: 'holder',
      expectedBalance: 85000,
      actualBalance: 85000,
      balances: {
        create: [
          { currency: 'USD', expectedBalance: 85000, actualBalance: 85000 }
        ]
      }
    }
  });

  // Goods In Transit
  await prisma.moneyHolder.create({
    data: {
      name: 'Goods In Transit',
      emoji: '🚢',
      color: 'orange',
      category: 'holder',
      expectedBalance: 252820,
      actualBalance: 252820,
      isSpecialTransit: true,
      balances: {
        create: [
          { currency: 'USD', expectedBalance: 252820, actualBalance: 252820 }
        ]
      }
    }
  });

  // 2. Create Third-Party Partner Accounts (category: "partner", color: "green" or "red")
  
  // Ahmed (Multi-currency: Holds both USD and EUR!)
  // Expected total USD = 25000 + (5000 * 1.08) = 30400
  // Actual total USD = 23000 + (5000 * 1.08) = 28400
  const ahmed = await prisma.moneyHolder.create({
    data: {
      name: 'Ahmed',
      emoji: '🤝',
      color: 'green', // money owed to you
      category: 'partner',
      partnerType: 'person',
      expectedBalance: 30400,
      actualBalance: 28400,
      balances: {
        create: [
          { currency: 'USD', expectedBalance: 25000, actualBalance: 23000 },
          { currency: 'EUR', expectedBalance: 5000, actualBalance: 5000 }
        ]
      }
    }
  });

  // Brother (Holds USD)
  await prisma.moneyHolder.create({
    data: {
      name: 'Brother',
      emoji: '🤝',
      color: 'green', // money owed to you
      category: 'partner',
      partnerType: 'person',
      expectedBalance: 55000,
      actualBalance: 55000,
      balances: {
        create: [
          { currency: 'USD', expectedBalance: 55000, actualBalance: 55000 }
        ]
      }
    }
  });

  // ZARBITI Factory (Partner Company - You owe them €10,000 EUR advance, color: "red")
  // Expected/Actual total USD = 10000 * 1.08 = 10800
  await prisma.moneyHolder.create({
    data: {
      name: 'ZARBITI Factory',
      emoji: '🏭',
      color: 'red', // money you owe
      category: 'partner',
      partnerType: 'company',
      expectedBalance: 10800,
      actualBalance: 10800,
      balances: {
        create: [
          { currency: 'EUR', expectedBalance: 10000, actualBalance: 10000 }
        ]
      }
    }
  });

  // 3. Create Upcoming Payments / Debit Accounts (category: "upcoming", color: "red" or "green")
  
  // Upcoming Rent Tunisia (Holds TND - expected 3,000 TND, actual 0 DT)
  // Expected total USD = 3000 * 0.32 = 960 USD
  await prisma.moneyHolder.create({
    data: {
      name: 'Upcoming Rent (Tunisia)',
      emoji: '🏢',
      color: 'red', // Money you owe/will pay
      category: 'upcoming',
      isUpcoming: true,
      expectedBalance: 960,
      actualBalance: 0,
      balances: {
        create: [
          { currency: 'TND', expectedBalance: 3000, actualBalance: 0 }
        ]
      }
    }
  });

  // Upcoming Container #4 Logistics (Holds USD - expected $4,500, actual 0)
  await prisma.moneyHolder.create({
    data: {
      name: 'Container #4 Logistics',
      emoji: '📋',
      color: 'red', // Money you will pay
      category: 'upcoming',
      isUpcoming: true,
      expectedBalance: 4500,
      actualBalance: 0,
      balances: {
        create: [
          { currency: 'USD', expectedBalance: 4500, actualBalance: 0 }
        ]
      }
    }
  });

  console.log('Money Holders with Multi-currency balances seeded successfully.');

  // Create Sample Movements for Ahmed's Timeline (Today and 3 days ago)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  await prisma.moneyMovement.create({
    data: {
      amount: 2000,
      currency: 'USD',
      amountInUsd: 2000,
      fromHolderId: ahmed.id, // From Ahmed (Ahmed returned $2,000 USD)
      toHolderId: null, // External output
      note: 'Returned $2,000 cash',
      createdAt: threeDaysAgo,
    },
  });

  const today = new Date();
  await prisma.moneyMovement.create({
    data: {
      amount: 5000,
      currency: 'USD',
      amountInUsd: 5000,
      fromHolderId: null, // External input
      toHolderId: ahmed.id, // To Ahmed (Gave Ahmed $5,000 USD)
      note: 'Cash given as loan',
      createdAt: today,
    },
  });

  console.log('Sample movement records seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
