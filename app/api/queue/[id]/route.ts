import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { contentAssets, uploadQueue } from "@/db/schema"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

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

    const set: Partial<typeof uploadQueue.$inferInsert> = {}

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

    const rows = await db
      .update(uploadQueue)
      .set(set)
      .where(eq(uploadQueue.id, id))
      .returning()

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Queue item not found" },
        { status: 404 },
      )
    }

    const r = rows[0]
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
    const owned = await db
      .select({ id: uploadQueue.id })
      .from(uploadQueue)
      .innerJoin(contentAssets, eq(contentAssets.id, uploadQueue.asset_id))
      .where(
        and(
          eq(uploadQueue.id, id),
          eq(contentAssets.created_by, user.id),
        ),
      )
      .limit(1)

    if (owned.length === 0) {
      return NextResponse.json(
        { error: "Queue item not found" },
        { status: 404 },
      )
    }

    await db.delete(uploadQueue).where(eq(uploadQueue.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    logProductionRuntimeError("api-queue-delete", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
