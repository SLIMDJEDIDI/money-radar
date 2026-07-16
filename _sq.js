const Database = require("better-sqlite3");
try {
  const db = new Database("prisma/dev.db", { readonly: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type=\"table\"").all();
  console.log("TABLES:", tables.map(t=>t.name).join(", "));
  for (const t of tables) {
    if (t.name.startsWith("Hub")) {
      const c = db.prepare(`SELECT COUNT(*) n FROM "${t.name}"`).get();
      console.log(t.name, "->", c.n, "rows");
    }
  }
} catch(e){ console.error("ERR", e.message); }
