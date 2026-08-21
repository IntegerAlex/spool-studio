import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { jsonError } from "@/lib/api-error"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { listNotifications } from "@/repositories/notifications-repository"

export async function GET() {
  try {
    const user = await requireUser()

    const rows = await listNotifications(user.id)

    return NextResponse.json({
      data: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        type: r.type,
        title: r.title,
        message: r.message,
        relatedAssetId: r.related_asset_id,
        read: r.read,
        createdAt: r.created_at,
      })),
    })
  } catch (error) {
    logProductionRuntimeError("api-notifications-get", error)
    return jsonError(error)
  }
}
