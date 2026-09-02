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
