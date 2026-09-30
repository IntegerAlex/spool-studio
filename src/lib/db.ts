import { Pool } from "pg"

let pool: Pool | null = null

/**
 * Returns the app-wide PostgreSQL connection pool, shared by the Drizzle
 * client (src/db/index.ts) and any remaining raw-query tooling.
 */
export function getPool(): Pool {
  if (pool) return pool

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required")
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : process.env.DATABASE_URL?.includes("sslmode=verify-full")
        ? { rejectUnauthorized: true }
        : false,
    max: parseInt(
      process.env.DB_POOL_MAX ?? (process.env.VERCEL ? "1" : "5"),
      10,
    ),
    // Neon pooler + free-tier compute sleep kill idle connections: reap them
    // fast and keep the rest alive so checkouts rarely race a dead socket.
    idleTimeoutMillis: parseInt(
      process.env.DB_IDLE_TIMEOUT ?? (process.env.VERCEL ? "5000" : "10000"),
      10,
    ),
    connectionTimeoutMillis: parseInt(
      process.env.DB_CONNECT_TIMEOUT ?? "10000",
      10,
    ),
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  })

  pool.on("error", (err) => {
    console.error("[db] unexpected pool error", { message: err.message })
  })

  return pool
}
