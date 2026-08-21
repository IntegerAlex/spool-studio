import { NextResponse } from "next/server"
import { requirePermission, requireUser } from "@/lib/auth"
import { ApiError, jsonError } from "@/lib/api-error"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  deleteNotificationForUser,
  markNotificationAsReadForUser,
} from "@/repositories/notifications-repository"

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Users may mark their OWN notifications read (repo scopes by user id);
    // admin-level management is only required for deletion below.
    const user = await requireUser()

    const { id } = await params
    const row = await markNotificationAsReadForUser(id, user.id)

    if (!row) {
      throw ApiError.notFound("Notification not found")
    }

    return NextResponse.json({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      relatedAssetId: row.related_asset_id,
      read: row.read,
      createdAt: row.created_at,
    })
  } catch (error) {
    logProductionRuntimeError("api-notifications-patch", error)
    return jsonError(error)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("notifications:manage")

    const { id } = await params
    const deleted = await deleteNotificationForUser(id, user.id)

    if (!deleted) {
      throw ApiError.notFound("Notification not found")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logProductionRuntimeError("api-notifications-delete", error)
    return jsonError(error)
  }
}
