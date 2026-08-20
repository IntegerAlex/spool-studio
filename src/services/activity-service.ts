import { getCurrentUser } from "@/lib/auth"
import { emitEvent } from "@/lib/event-bus"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  insertActivity,
  listActivityByAssetId,
} from "@/repositories/asset-activity-repository"
import {
  getOrCreateCurrentUserProfile,
  getUsersByIds,
} from "@/services/users-service"
import type { Json } from "@/types"
import type { AssetActivityLog } from "@/types/index"

export interface ActivityInput {
  assetId: string
  action: string
  metadata?: Record<string, Json>
}

// oxlint-disable-next-line anti-slop/no-unknown-parameters  // external input at boundary (JSON serializer)
function toJson(value: unknown): Json {
  // oxlint-disable anti-slop/no-runtime-typeof  // JSON value discrimination at I/O boundary
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJson(item))
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      // SAFETY: this cast is safe because the value already conforms to the asserted type.
      Object.entries(value as Record<string, Json>).map(
        ([key, nestedValue]) => [key, toJson(nestedValue)],
      ),
    )
  }
  // oxlint-enable anti-slop/no-runtime-typeof

  return null
}

function mapActivity(
  row: Awaited<ReturnType<typeof insertActivity>>,
): AssetActivityLog {
  return {
    id: row.id,
    assetId: row.asset_id,
    userId: row.user_id,
    action: row.action,
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    metadata: (row.metadata as Record<string, Json>) ?? {},
    createdAt: new Date(row.created_at),
  }
}

export async function getAssetActivity(
  assetId: string,
  options?: { limit?: number },
): Promise<AssetActivityLog[]> {
  try {
    const rows = await listActivityByAssetId(assetId, options)
    return rows.map((row) => mapActivity(row))
  } catch (error) {
    logProductionRuntimeError("activity-loader", error, { assetId })
    return []
  }
}

export async function getAssetActivityWithUsers(
  assetId: string,
  options?: { limit?: number },
): Promise<{
  activity: AssetActivityLog[]
  users: Awaited<ReturnType<typeof getUsersByIds>>
}> {
  const activity = await getAssetActivity(assetId, options)
  // SAFETY: this cast is safe because the value already conforms to the asserted type.
  const userIds = Array.from(
    new Set(activity.map((entry) => entry.userId).filter(Boolean)),
  ) as string[]
  const users = await getUsersByIds(userIds)
  return { activity, users }
}

export async function logAssetActivity(
  input: ActivityInput,
): Promise<AssetActivityLog> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }

  await getOrCreateCurrentUserProfile()

  const record = await insertActivity({
    asset_id: input.assetId,
    user_id: user.id,
    action: input.action,
    metadata: toJson(input.metadata ?? {}),
  })

  const mapped = mapActivity(record)

  try {
    emitEvent({
      type: "asset.activity",
      payload: {
        id: mapped.id,
        assetId: input.assetId,
        action: input.action,
        metadata: input.metadata ?? {},
        createdAt: mapped.createdAt.toISOString(),
      },
    })
  } catch {
    // non-blocking - event bus is in-memory only
  }

  return mapped
}
