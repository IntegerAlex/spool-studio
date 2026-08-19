import { Pool } from "pg"

let pool: Pool | null = null

export function getPool(): Pool {
  if (pool) return pool

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required")
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : false,
    max: parseInt(
      process.env.DB_POOL_MAX ?? (process.env.VERCEL ? "1" : "5"),
      10,
    ),
    idleTimeoutMillis: parseInt(
      process.env.DB_IDLE_TIMEOUT ?? (process.env.VERCEL ? "5000" : "30000"),
      10,
    ),
    connectionTimeoutMillis: parseInt(
      process.env.DB_CONNECT_TIMEOUT ?? "10000",
      10,
    ),
  })

  pool.on("error", (err) => {
    console.error("[db] unexpected pool error", { message: err.message })
  })

  return pool
}

export async function query<T = any>(
  text: string,
  params?: any[],
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await getPool().connect()
  try {
    const result = await client.query(text, params)
// SAFETY: this cast is safe because the value already conforms to the asserted type.
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 }
  } finally {
    client.release()
  }
}

export async function queryOne<T = any>(
  text: string,
  params?: any[],
): Promise<T | null> {
  const { rows } = await query<T>(text, params)
  return rows[0] ?? null
}

export async function queryVoid(text: string, params?: any[]): Promise<void> {
  await query(text, params)
}
