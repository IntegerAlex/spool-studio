import { NextResponse } from "next/server"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { getUserDetail } from "@/services/users-service"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const userId = params?.id
    if (!userId) {
      return NextResponse.json(
        { error: "User id is required" },
        { status: 400 },
      )
    }
    const user = await getUserDetail(userId)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ data: user })
  } catch (error) {
    logProductionRuntimeError("api-users-id-get", error)
    return NextResponse.json({ data: null })
  }
}
