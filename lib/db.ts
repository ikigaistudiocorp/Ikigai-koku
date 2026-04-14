import { Pool, type QueryResult, type QueryResultRow } from "pg";

declare global {
  var __kokuPgPool: Pool | undefined;
}

function createPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
  pool.on("error", (err) => {
    console.error("[db] unexpected pool error:", err);
  });
  return pool;
}

export const pool: Pool =
  global.__kokuPgPool ?? (global.__kokuPgPool = createPool());

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as never);
}
