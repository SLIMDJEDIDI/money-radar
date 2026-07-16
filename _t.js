const { PrismaClient } = require("@prisma/client");
async function test(url, label) {
  const p = new PrismaClient({ datasources: { db: { url } } });
  try {
    const r = await p.$queryRawUnsafe("SELECT count(*)::int n FROM \"HubContact\"");
    console.log(label, "OK -> HubContact rows:", r[0].n);
  } catch(e){ console.log(label, "FAIL:", e.message.split("\n")[0]); }
  finally { await p.$disconnect(); }
}
(async () => {
  const pw = "MoneyHub_Isolated_2026_%21";
  const ref = "dzhtkakwudqiosprvbzc";
  await test(`postgresql://postgres.${ref}:${pw}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true`, "aws-0:6543");
  await test(`postgresql://postgres.${ref}:${pw}@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true`, "aws-1:6543");
})();
