import { sql } from "drizzle-orm"
import { db } from "@/db"

export async function assignAssetNumber(
  cycleId: string,
  assetType: string,
): Promise<number> {
  const { rows } = await db.execute(
    sql`select public.assign_asset_number(${cycleId}::uuid, ${assetType}::public.asset_type) as next_number`,
  )
  // SAFETY: assign_asset_number() always returns one row whose
  // next_number column holds the assigned number.
  const row = rows[0] as { next_number: number } | undefined
  if (!row) {
    throw new Error("Failed to assign asset number")
  }
  return Number(row.next_number)
}

/**
 * Claim the smallest free asset number at or above `floor`, filling gaps
 * left by deleted assets. Transactional with an advisory lock so concurrent
 * creates can't claim the same number. Keeps the monotonic sequence ahead
 * of the claim for readers that still use it.
 */
export async function claimAssetNumber(
  cycleId: string,
  assetType: string,
  floor: number,
): Promise<number> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${cycleId} || ${assetType}))`,
    )
    const used = await tx.execute(
      sql`select asset_number from public.content_assets
          where cycle_id = ${cycleId}::uuid and type = ${assetType}::public.asset_type
          and asset_number is not null`,
    )
    const taken = new Set(
      (used.rows as Array<{ asset_number: number }>).map((r) =>
        Number(r.asset_number),
      ),
    )
    let n = Math.max(1, floor)
    while (taken.has(n)) n += 1
    await tx.execute(
      sql`insert into public.service_cycle_sequences (cycle_id, asset_type, next_number)
          values (${cycleId}::uuid, ${assetType}::public.asset_type, ${(n + 1).toString()}::integer)
          on conflict (cycle_id, asset_type) do update
          set next_number = greatest(public.service_cycle_sequences.next_number, excluded.next_number)`,
    )
    return n
  })
}

export async function ensureSequenceAtLeast(
  cycleId: string,
  assetType: string,
  minNext: number,
): Promise<void> {
  await db.execute(
    sql`insert into public.service_cycle_sequences (cycle_id, asset_type, next_number)
        values (${cycleId}::uuid, ${assetType}::public.asset_type, ${minNext}::integer)
        on conflict (cycle_id, asset_type) do update
        set next_number = greatest(public.service_cycle_sequences.next_number, excluded.next_number)`,
  )
}
