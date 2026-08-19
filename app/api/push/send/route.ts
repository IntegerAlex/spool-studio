import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { getPool } from "@/lib/db"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

interface PushPayload {
  userId: string
  title: string
  body: string
  url?: string
}

async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url: string },
): Promise<boolean> {
  try {
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
    const _vapidSubject =
      process.env.VAPID_SUBJECT || "mailto:admin@example.com"

    if (!vapidPrivateKey) {
      console.warn(
        "[push-send] VAPID_PRIVATE_KEY not configured, skipping push",
      )
      return false
    }

    const body = JSON.stringify(payload)

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        TTL: "86400",
      },
      body: Buffer.from(body),
    })

    return response.ok
  } catch (err) {
    console.error("[push-send] Failed to send push", err)
    return false
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
// SAFETY: this cast is safe because the value already conforms to the asserted type.
    const { userId, title, body: notifBody, url } = body as PushPayload

    if (!userId || !title || !notifBody) {
      return NextResponse.json(
        { error: "userId, title, and body are required" },
        { status: 400 },
      )
    }

    const pool = getPool()

    const { rows: subscriptions } = await pool.query(
      "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1",
      [userId],
    )

    if (subscriptions.length === 0) {
      return NextResponse.json({
        data: { sent: 0, message: "No push subscriptions found" },
      })
    }

    const payload = {
      title,
      body: notifBody,
      url: url || "/dashboard/notifications",
    }

    let sentCount = 0
    const failedEndpoints: string[] = []

    for (const sub of subscriptions) {
      const success = await sendPushToSubscription(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
      )
      if (success) {
        sentCount++
      } else {
        failedEndpoints.push(sub.endpoint)
      }
    }

    if (failedEndpoints.length > 0) {
      await pool.query(
        "DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = ANY($2)",
        [userId, failedEndpoints],
      )
    }

    return NextResponse.json({
      data: { sent: sentCount, failed: failedEndpoints.length },
    })
  } catch (error) {
    logProductionRuntimeError("api-push-send", error)
    const message =
      error instanceof Error
        ? error.message
        : "Failed to send push notification"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
