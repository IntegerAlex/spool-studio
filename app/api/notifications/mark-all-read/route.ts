import { eq, isNull, or } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { notifications } from "@/db/schema"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

export async function POST() {
  try {
    const user = await requireUser()
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await db
      .update(notifications)
      .set({ read: true })
      .where(
        or(eq(notifications.user_id, user.id), isNull(notifications.user_id)),
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    logProductionRuntimeError("api-notifications-mark-all-read", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
