import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  deleteUploadQueueItem,
  getOwnedUploadQueueItem,
  updateUploadQueueItem,
} from "@/repositories/upload-queue-repository"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser()
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const updates = await request.json()

    const set: Parameters<typeof updateUploadQueueItem>[1] = {}

    if (updates.status !== undefined) {
      set.status = updates.status
    }
    if (updates.scheduledDate !== undefined) {
      set.scheduled_date = updates.scheduledDate
    }
    if (updates.caption !== undefined) {
      set.caption = updates.caption
    }
    if (updates.hashtags !== undefined) {
      // SAFETY: hashtags arrive from a parsed JSON payload; runtime shape matches the DB column.
      set.hashtags = updates.hashtags as never
    }
    if (updates.platform !== undefined) {
      set.platform = updates.platform
    }
    if (updates.recurrence !== undefined) {
      // SAFETY: recurrence arrives from a parsed JSON payload; runtime shape matches the DB column.
      set.recurrence = (updates.recurrence ? updates.recurrence : null) as never
    }

    if (Object.keys(set).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      )
    }

    const r = await updateUploadQueueItem(id, set)

    return NextResponse.json({
      id: r.id,
      assetId: r.asset_id,
      scheduledDate: r.scheduled_date,
      platform: r.platform,
      status: r.status,
      caption: r.caption,
      hashtags: r.hashtags,
    })
  } catch (error) {
    logProductionRuntimeError("api-queue-patch", error)
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

    // Verify ownership: the queue item must belong to an asset the user created
    // before allowing deletion (prevents deleting unrelated items).
    const owned = await getOwnedUploadQueueItem(id, user.id)

    if (!owned) {
      return NextResponse.json(
        { error: "Queue item not found" },
        { status: 404 },
      )
    }

    await deleteUploadQueueItem(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    logProductionRuntimeError("api-queue-delete", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
