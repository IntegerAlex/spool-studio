import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { pushSubscriptions } from "@/db/schema"
import { requireUser } from "@/lib/auth"
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

    const existing = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.endpoint, endpoint),
          eq(pushSubscriptions.user_id, user.id),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json({
        data: { id: existing[0].id, message: "Subscription already exists" },
      })
    }

    const rows = await db
      .insert(pushSubscriptions)
      .values({ user_id: user.id, endpoint, p256dh, auth })
      .returning({
        id: pushSubscriptions.id,
        user_id: pushSubscriptions.user_id,
        endpoint: pushSubscriptions.endpoint,
        created_at: pushSubscriptions.created_at,
      })

    return NextResponse.json({ data: rows[0] }, { status: 201 })
  } catch (error) {
    logProductionRuntimeError("api-push-subscribe", error)
    const message =
      error instanceof Error ? error.message : "Failed to save subscription"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
