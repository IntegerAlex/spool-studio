import { createServerSupabaseClient } from "@/lib/supabase/server"

let cachedMigrationResult: { ok: boolean; missing?: string[] } | null = null

export async function checkClientGoalsMigration(): Promise<{
  ok: boolean
  missing?: string[]
}> {
  if (cachedMigrationResult?.ok) {
    return cachedMigrationResult
  }

  try {
    const supabase = await createServerSupabaseClient()
    // check columns existence by attempting to select them
    const { data: cols, error } = await supabase
      .from("clients")
      .select("id, monthly_goal, weekly_goal")
      .limit(1)
      .maybeSingle()

    if (error) {
      return { ok: false, missing: ["clients table or columns missing"] }
    }

    // now check function existence via rpc dry-run (get: true)
    const { error: fnErr } = await supabase.rpc(
      "clients_weekly_counts",
      { week_start: new Date().toISOString() },
      { head: true, get: true },
    )
    if (fnErr) {
      return { ok: false, missing: ["clients_weekly_counts function missing"] }
    }

    const res = { ok: true }
    cachedMigrationResult = res
    return res
  } catch (err) {
    return { ok: false, missing: [(err as Error).message] }
  }
}
