import { sql } from "drizzle-orm"
import { db } from "@/db"
import { clients } from "@/db/schema"

let cachedMigrationResult: { ok: boolean; missing?: string[] } | null = null

export async function checkClientGoalsMigration(): Promise<{
  ok: boolean
  missing?: string[]
}> {
  if (cachedMigrationResult?.ok) {
    return cachedMigrationResult
  }

  try {
    await db
      .select({
        id: clients.id,
        monthly_goal: clients.monthly_goal,
        weekly_goal: clients.weekly_goal,
      })
      .from(clients)
      .limit(1)
  } catch {
    return { ok: false, missing: ["clients table or columns missing"] }
  }

  // Check the RPC function exists in the public schema.
  try {
    const { rows } = await db.execute(
      sql`SELECT 1 AS ok FROM pg_proc WHERE proname = ${"clients_weekly_counts"} AND pronamespace = 'public'::regnamespace LIMIT 1`,
    )
    if (rows.length === 0) {
      return {
        ok: false,
        missing: ["clients_weekly_counts function missing"],
      }
    }
  } catch {
    return {
      ok: false,
      missing: ["clients_weekly_counts function missing"],
    }
  }

  const res = { ok: true }
  cachedMigrationResult = res
  return res
}
