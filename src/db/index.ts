import { drizzle } from "drizzle-orm/node-postgres"
import { getPool } from "@/lib/db"
import * as schema from "./schema"

// Reuse the app-wide pg pool from src/lib/db so raw queries and
// Drizzle queries share a single connection pool.
export const db = drizzle(getPool(), { schema })

export type DB = typeof db

/**
 * Accepts either a string or a Date for timestamp (Date) columns, so callers
 * built around ISO-string payloads (e.g. from JSON requests) can still use the
 * typed insert/update shapes. Non-timestamp fields stay strictly typed.
 */
export type FlexibleInsert<T> = {
  [K in keyof T]: T[K] extends Date | null | undefined
    ? string | Date | null | undefined
    : T[K]
}

export { getPool as pool }
