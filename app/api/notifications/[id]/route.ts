import { and, eq, isNull, or } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { notifications } from "@/db/schema"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser()
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const rows = await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, id),
          or(eq(notifications.user_id, user.id), isNull(notifications.user_id)),
        ),
      )
      .returning({
        id: notifications.id,
        user_id: notifications.user_id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        related_asset_id: notifications.related_asset_id,
        read: notifications.read,
        created_at: notifications.created_at,
      })

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 },
      )
    }

    const r = rows[0]
    return NextResponse.json({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      title: r.title,
      message: r.message,
      relatedAssetId: r.related_asset_id,
      read: r.read,
      createdAt: r.created_at,
    })
  } catch (error) {
    logProductionRuntimeError("api-notifications-patch", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser()
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const deleted = await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, id),
          or(eq(notifications.user_id, user.id), isNull(notifications.user_id)),
        ),
      )
      .returning({ id: notifications.id })

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logProductionRuntimeError("api-notifications-delete", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
