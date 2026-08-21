import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { getUsers } from "@/services/users-service"

export async function GET() {
  try {
    await requirePermission("team:read")
    const users = await getUsers()
    return NextResponse.json({ data: users })
  } catch (error) {
    logProductionRuntimeError("api-users-get", error)
    return NextResponse.json({ data: [] })
  }
}
