const { PrismaClient } = require('@prisma/client');
const { scryptSync, randomBytes } = require('crypto');

const URL = 'postgresql://postgres.cfbythrebgfgvydzgkgj:REDACTED@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10';
const p = new PrismaClient({ datasourceUrl: URL });

function hash(pw) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(pw, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

// Generate a strong human-typable password: 4 words + 4-digit suffix
const words = ['Rocket','Falcon','Bison','Velvet','Neptune','Orbit','Cactus','Marble','Cobalt','Zephyr','Copper','Aurora','Delta','Echo','Fjord','Granite'];
function pick() { return words[Math.floor(Math.random()*words.length)]; }
const newPw = `${pick()}-${pick()}-${pick()}-${Math.floor(1000+Math.random()*9000)}`;

(async () => {
  const before = await p.hubUser.findUnique({ where: { username: 'admin' }, select: { id: true, username: true, role: true } });
  console.log('BEFORE:', JSON.stringify(before));

  const passwordHash = hash(newPw);
  const updated = await p.hubUser.update({ where: { username: 'admin' }, data: { passwordHash } });
  console.log('UPDATED user', updated.username, '- new hash stored.');

  console.log('\n=================================================');
  console.log('NEW ADMIN PASSWORD:', newPw);
  console.log('=================================================\n');

  await p.$disconnect();
})().catch(async e => { console.error('FAIL:', e); await p.$disconnect(); process.exit(1); });
