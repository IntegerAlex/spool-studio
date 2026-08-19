/**
 * Server-side database client.
 * Returns a Supabase-compatible query builder backed by direct PostgreSQL (Neon).
 */
import { createSupabaseCompat } from "./compat"

let cachedClient: ReturnType<typeof createSupabaseCompat> | null = null

export async function createServerSupabaseClient() {
  if (cachedClient) return cachedClient
  cachedClient = createSupabaseCompat()
  return cachedClient
}
