import { NextResponse } from "next/server"
import { z } from "zod"
import { parseBody } from "@/lib/api-validation"
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
    const body = await request.json()

    const queueUpdateSchema = z.object({
      status: z.string().optional(),
      scheduledDate: z.coerce.date().optional(),
      caption: z.string().nullish(),
      hashtags: z.string().nullish(),
      platform: z.string().nullish(),
      recurrence: z.unknown().optional(),
    })
    const parsed = parseBody(queueUpdateSchema, body)
    if (!parsed.ok) {
      return parsed.response
    }
    const input = parsed.data

    const set: Parameters<typeof updateUploadQueueItem>[1] = {}

    if (input.status !== undefined) {
      set.status = input.status
    }
    if (input.scheduledDate !== undefined) {
      set.scheduled_date = input.scheduledDate
    }
    if (input.caption !== undefined) {
      set.caption = input.caption
    }
    if (input.hashtags !== undefined) {
      set.hashtags = input.hashtags
    }
    if (input.platform !== undefined) {
      set.platform = input.platform
    }
    if (input.recurrence !== undefined) {
      set.recurrence = input.recurrence ? input.recurrence : null
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
