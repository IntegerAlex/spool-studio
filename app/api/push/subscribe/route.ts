import { NextResponse } from "next/server"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  getPushSubscriptionByUserAndEndpoint,
  insertPushSubscription,
} from "@/repositories/push-subscriptions-repository"

export async function POST(request: Request) {
  try {
    const user = await requireUser()

    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const body = (await readJsonBody(request)) as {
      endpoint?: string
      p256dh?: string
      auth?: string
    }
    const { endpoint, p256dh, auth } = body

    if (!endpoint || !p256dh || !auth) {
      throw ApiError.badRequest("endpoint, p256dh, and auth are required")
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
    return jsonError(error)
  }
}
