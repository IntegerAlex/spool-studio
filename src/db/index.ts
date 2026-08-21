import { drizzle } from "drizzle-orm/node-postgres"
import { getPool } from "@/lib/db"
import * as schema from "./schema"

// Reuse the app-wide pg pool from src/lib/db so raw queries and
// Drizzle queries share a single connection pool.
export const db = drizzle(getPool(), { schema })

export type DB = typeof db

export { getPool as pool }
