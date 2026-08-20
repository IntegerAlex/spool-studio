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
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json(
        { error: "endpoint is required" },
        { status: 400 },
      )
    }

    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.user_id, user.id),
          eq(pushSubscriptions.endpoint, endpoint),
        ),
      )

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    logProductionRuntimeError("api-push-unsubscribe", error)
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 },
    )
  }
}
