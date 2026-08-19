import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { getPool } from "@/lib/db"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import type { UploadQueueStatus } from "@/types/index"

export async function GET() {
  try {
    const user = await requireUser()
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const pool = getPool()
    const { rows } = await pool.query(
      `SELECT q.id, q.asset_id, q.scheduled_date, q.platform, q.status, q.caption, q.hashtags, q.created_at
       FROM upload_queue q
       JOIN content_assets a ON a.id = q.asset_id
       WHERE a.created_by = $1
       ORDER BY q.scheduled_date ASC`,
      [user.id],
    )

    return NextResponse.json({
      data: rows.map((r) => ({
        id: r.id,
        assetId: r.asset_id,
        scheduledDate: r.scheduled_date,
        platform: r.platform,
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

    const pool = getPool()
    const id = crypto.randomUUID()
    await pool.query(
      `INSERT INTO upload_queue (id, asset_id, scheduled_date, platform, status, caption, hashtags, created_at, recurrence)
       VALUES ($1, $2, $3, $4, 'scheduled', $5, $6, NOW(), $7)`,
      [
        id,
        assetId,
        scheduledDate,
        platform,
        caption || null,
        hashtags ? JSON.stringify(hashtags) : null,
        recurrence ? JSON.stringify(recurrence) : null,
      ],
    )

    const { rows } = await pool.query(
      "SELECT * FROM upload_queue WHERE id = $1",
      [id],
    )
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
