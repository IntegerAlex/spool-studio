import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { markAllNotificationsAsRead } from "@/repositories/notifications-repository"

export async function POST() {
  try {
    const user = await requireUser()
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await markAllNotificationsAsRead(user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    logProductionRuntimeError("api-notifications-mark-all-read", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
