import { NextResponse } from "next/server"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { getUsers } from "@/services/users-service"

export async function GET() {
  try {
    const users = await getUsers()
    return NextResponse.json({ data: users })
  } catch (error) {
    logProductionRuntimeError("api-users-get", error)
    return NextResponse.json({ data: [] })
  }
}
