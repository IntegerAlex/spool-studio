import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { contentAssets, uploadQueue } from "@/db/schema"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import type { UploadQueueStatus } from "@/types/index"

export async function GET() {
  try {
    const user = await requireUser()
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const rows = await db
      .select({
        id: uploadQueue.id,
        asset_id: uploadQueue.asset_id,
        scheduled_date: uploadQueue.scheduled_date,
        platform: uploadQueue.platform,
        status: uploadQueue.status,
        caption: uploadQueue.caption,
        hashtags: uploadQueue.hashtags,
        created_at: uploadQueue.created_at,
      })
      .from(uploadQueue)
      .innerJoin(contentAssets, eq(contentAssets.id, uploadQueue.asset_id))
      .where(eq(contentAssets.created_by, user.id))
      .orderBy(uploadQueue.scheduled_date)

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
    const rows = await db
      .insert(uploadQueue)
      .values({
        asset_id: assetId,
        scheduled_date: scheduledDate,
        platform,
        status: "scheduled",
        caption: caption || null,
        hashtags: (hashtags as never) || null,
        recurrence: (recurrence as never) || null,
      })
      .returning()

    const r = rows[0]

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
