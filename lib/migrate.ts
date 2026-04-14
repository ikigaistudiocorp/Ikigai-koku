import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// tsx doesn't auto-load .env.local the way `next` does. Load it manually
// from the cwd before importing anything that reads process.env.
function loadDotEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function main() {
  loadDotEnvLocal();

  // Dynamic import so lib/db.ts reads DATABASE_URL AFTER we populate it.
  const { pool } = await import("./db");

  const sqlPath = resolve(process.cwd(), "lib/schema.sql");
  const sql = readFileSync(sqlPath, "utf8");

  console.log("[migrate] applying schema.sql ...");
  const started = Date.now();
  await pool.query(sql);
  console.log(`[migrate] done in ${Date.now() - started}ms`);

  const { rows } = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`
  );
  console.log("[migrate] tables present:");
  for (const r of rows) console.log("  -", r.table_name);

  await pool.end();
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
