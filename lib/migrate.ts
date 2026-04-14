import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pool } from "./db";

async function main() {
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
