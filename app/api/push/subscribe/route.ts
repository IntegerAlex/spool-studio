import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  getPushSubscriptionByUserAndEndpoint,
  insertPushSubscription,
} from "@/repositories/push-subscriptions-repository"

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

    const existing = await getPushSubscriptionByUserAndEndpoint(
      user.id,
      endpoint,
    )

    if (existing) {
      return NextResponse.json({
        data: { id: existing.id, message: "Subscription already exists" },
      })
    }

    const row = await insertPushSubscription({
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
    })

    return NextResponse.json(
      {
        data: {
          id: row.id,
          user_id: row.user_id,
          endpoint: row.endpoint,
          created_at: row.created_at,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    logProductionRuntimeError("api-push-subscribe", error)
    const message =
      error instanceof Error ? error.message : "Failed to save subscription"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
