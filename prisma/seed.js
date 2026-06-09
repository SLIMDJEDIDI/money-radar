const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Money Radar with ZERO balances for clean testing...');

  // Clean existing database
  await prisma.moneyMovement.deleteMany({});
  await prisma.holderBalance.deleteMany({});
  await prisma.moneyHolder.deleteMany({});

  const defaultHolders = [
    // 1. My Wallets
    { id: 'h1', name: 'Slim Cash', emoji: '💵', color: 'blue', category: 'holder', currencies: ['USD'] },
    { id: 'h2', name: 'Slim Bank', emoji: '🏦', color: 'blue', category: 'holder', currencies: ['USD'] },
    { id: 'h3', name: 'Wise', emoji: '💳', color: 'blue', category: 'holder', currencies: ['USD'] },
    { id: 'h4', name: 'Guangzhou Office', emoji: '🇨🇳', color: 'blue', category: 'holder', currencies: ['USD'] },
    { id: 'h5', name: 'Goods In Transit', emoji: '🚢', color: 'orange', category: 'holder', currencies: ['USD'], isSpecialTransit: true },
    
    // 2. Partners
    { id: 'h6', name: 'Ahmed', emoji: '🤝', color: 'green', category: 'partner', partnerType: 'person', currencies: ['USD', 'EUR'] },
    { id: 'h7', name: 'Brother', emoji: '🤝', color: 'green', category: 'partner', partnerType: 'person', currencies: ['USD'] },
    { id: 'h8', name: 'ZARBITI Factory', emoji: '🏭', color: 'red', category: 'partner', partnerType: 'company', currencies: ['EUR'] },
    
    // 3. Upcoming Payments
    { id: 'h9', name: 'Upcoming Rent (Tunisia)', emoji: '🏢', color: 'red', category: 'upcoming', currencies: ['TND'] },
    { id: 'h10', name: 'Container #4 Logistics', emoji: '📋', color: 'red', category: 'upcoming', currencies: ['USD'] }
  ];

  for (const h of defaultHolders) {
    // Create the MoneyHolder with $0 USD aggregated balance
    const holder = await prisma.moneyHolder.create({
      data: {
        id: h.id,
        name: h.name,
        emoji: h.emoji,
        color: h.color,
        category: h.category,
        partnerType: h.partnerType || null,
        isUpcoming: h.category === 'upcoming',
        expectedBalance: 0,
        actualBalance: 0,
        isSpecialTransit: !!h.isSpecialTransit
      }
    });

    // Create the empty sub-wallets
    for (const curr of h.currencies) {
      await prisma.holderBalance.create({
        data: {
          holderId: holder.id,
          currency: curr,
          expectedBalance: 0,
          actualBalance: 0
        }
      });
    }
    console.log(`Initialized account: ${h.name} with empty ${h.currencies.join(', ')} wallet(s)`);
  }

  console.log('Database successfully reset to absolute zero! Ready for clean testing.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
