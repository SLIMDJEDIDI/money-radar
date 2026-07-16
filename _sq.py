import sqlite3, os
db = sqlite3.connect("prisma/dev.db")
cur = db.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type=\"table\"")
tables = [r[0] for r in cur.fetchall()]
print("TABLES:", ", ".join(tables))
for t in tables:
    if t.startswith("Hub"):
        try:
            cur.execute(f'SELECT COUNT(*) FROM "{t}"')
            print(t, "->", cur.fetchone()[0], "rows")
        except Exception as e:
            print(t, "ERR", e)
db.close()
