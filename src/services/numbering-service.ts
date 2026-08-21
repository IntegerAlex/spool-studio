import { sql } from "drizzle-orm"
import { db } from "@/db"
import type { AssetType } from "@/types/index"

const TYPE_PREFIX = {
  reel: "R",
  poster: "P",
} satisfies Record<AssetType, string>

const MONTH_ABBREV = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

/**
 * Get the next monotonic asset number for a cycle+type.
 * Race-safe: calls the assign_asset_number SQL function which atomically
 * increments a counter. Numbers are never reused, even after asset deletion.
 */
export async function getNextAssetNumber(
  cycleId: string,
  assetType: AssetType,
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
 * Generate a smart asset title.
 * Format: {ClientShortForm}_{MonthAbbrev}_{TypePrefix}{Number}
 * Example: FS_Jul_R04
 */
export function generateAssetTitle(
  clientShortForm: string,
  cycleStartDate: string,
  assetType: AssetType,
  number: number,
): string {
  const date = new Date(cycleStartDate)
  const monthAbbrev = MONTH_ABBREV[date.getMonth()]
  const prefix = TYPE_PREFIX[assetType]
  const paddedNumber = String(number).padStart(2, "0")

  return `${clientShortForm}_${monthAbbrev}_${prefix}${paddedNumber}`
}

/**
 * Extract a short form from a client name.
 * "FlySeas" → "FS", "Blue Horizon" → "BH"
 */
export function extractClientShortForm(clientName: string): string {
  const words = clientName.trim().split(/\s+/)
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }
  return words
    .map((w) => w.charAt(0))
    .join("")
    .substring(0, 3)
    .toUpperCase()
}
