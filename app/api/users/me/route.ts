import { NextResponse } from "next/server"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { getOrCreateCurrentUserProfile } from "@/services/users-service"

export async function GET() {
  try {
    const user = await getOrCreateCurrentUserProfile()
    return NextResponse.json({ data: user })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized"
    logProductionRuntimeError("api-users-me", error)
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
