import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsPostgresqlDrizzle?: NodePgDatabase;
};

/**
 * Lazily initialises the Postgres Pool + Drizzle client on first access.
 * Importing this file is always safe — nothing throws at module scope,
 * so builds that pre-render routes won't crash when DATABASE_URL is absent.
 */
function getDb(): NodePgDatabase {
  if (globalForDb.__arenaNextJsPostgresqlDrizzle) {
    return globalForDb.__arenaNextJsPostgresqlDrizzle;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const poolConfig: PoolConfig = { connectionString: databaseUrl };

  const pool =
    globalForDb.__arenaNextJsPostgresqlPool ?? new Pool(poolConfig);

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }

  const instance = drizzle(pool);
  globalForDb.__arenaNextJsPostgresqlDrizzle = instance;
  return instance;
}

type AnyDb = NodePgDatabase<any>;

/**
 * Safe to import at the top of any file. The real Pool / Drizzle client is
 * only created the first time `db` is actually *used* (e.g. `db.select()`).
 */
export const db: AnyDb = new Proxy({} as AnyDb, {
  get(_target, prop) {
    const realDb = getDb();
    const value = (realDb as any)[prop];
    if (typeof value === "function") {
      return value.bind(realDb);
    }
    return value;
  },
});
