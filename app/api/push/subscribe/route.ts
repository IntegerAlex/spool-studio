import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { getPool } from "@/lib/db"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint, p256dh, auth } = body

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "endpoint, p256dh, and auth are required" },
        { status: 400 },
      )
    }

    const pool = getPool()

    const { rows: existing } = await pool.query(
      "SELECT id FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2",
      [endpoint, user.id],
    )

    if (existing.length > 0) {
      return NextResponse.json({
        data: { id: existing[0].id, message: "Subscription already exists" },
      })
    }

    const { rows } = await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, endpoint, created_at`,
      [user.id, endpoint, p256dh, auth],
    )

    return NextResponse.json({ data: rows[0] }, { status: 201 })
  } catch (error) {
    logProductionRuntimeError("api-push-subscribe", error)
    const message =
      error instanceof Error ? error.message : "Failed to save subscription"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
