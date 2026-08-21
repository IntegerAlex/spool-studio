import { NextResponse } from "next/server"
import { z } from "zod"
import { parseBody } from "@/lib/api-validation"
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

    const res = NextResponse.json({
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
    res.headers.set("Cache-Control", "private, max-age=10, stale-while-revalidate=30")
    return res
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

    const body = await request.json()
    const queueCreateSchema = z.object({
      assetId: z.string().uuid("assetId must be a valid id"),
      scheduledDate: z.coerce.date(),
      platform: z.string().min(1),
      caption: z.string().nullish(),
      hashtags: z.string().nullish(),
      recurrence: z.unknown().optional(),
    })
    const parsed = parseBody(queueCreateSchema, body)
    if (!parsed.ok) {
      return parsed.response
    }
    const input = parsed.data

    const r = await insertUploadQueueItem({
      asset_id: input.assetId,
      scheduled_date: input.scheduledDate,
      platform: input.platform,
      status: "scheduled",
      caption: input.caption || null,
      hashtags: input.hashtags || null,
      recurrence: input.recurrence || null,
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
