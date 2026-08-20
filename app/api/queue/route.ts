import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import type { UploadQueueStatus } from "@/types/index"
import {
  insertUploadQueueItem,
  listUploadQueueForUser,
} from "@/repositories/upload-queue-repository"

export async function GET() {
  try {
    const user = await requireUser()
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const rows = await listUploadQueueForUser(user.id)

    return NextResponse.json({
      data: rows.map((r) => ({
        id: r.id,
        assetId: r.asset_id,
        scheduledDate: r.scheduled_date,
        platform: r.platform,
        // SAFETY: r.status is the DB enum string; narrowed to the UploadQueueStatus union.
        status: r.status as UploadQueueStatus,
        caption: r.caption,
        hashtags: r.hashtags,
        createdAt: r.created_at,
      })),
    })
  } catch (error) {
    logProductionRuntimeError("api-queue-get", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { assetId, scheduledDate, platform, caption, hashtags, recurrence } =
      await request.json()

    if (!assetId || !scheduledDate || !platform) {
      return NextResponse.json(
        { error: "assetId, scheduledDate, and platform are required" },
        { status: 400 },
      )
    }

    // SAFETY: hashtags/recurrence arrive from a parsed JSON payload; runtime shape matches the DB column.
    const r = await insertUploadQueueItem({
      asset_id: assetId,
      scheduled_date: scheduledDate,
      platform,
      status: "scheduled",
      caption: caption || null,
      hashtags: (hashtags as never) || null,
      recurrence: (recurrence as never) || null,
    })

    return NextResponse.json(
      {
        data: {
          id: r.id,
          assetId: r.asset_id,
          scheduledDate: r.scheduled_date,
          platform: r.platform,
          status: r.status,
          caption: r.caption,
          hashtags: r.hashtags,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    logProductionRuntimeError("api-queue-create", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
