import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { jsonError } from "@/lib/api-error"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { markAllNotificationsAsRead } from "@/repositories/notifications-repository"

export async function POST() {
  try {
    const user = await requireUser()

    await markAllNotificationsAsRead(user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    logProductionRuntimeError("api-notifications-mark-all-read", error)
    return jsonError(error)
  }
}
