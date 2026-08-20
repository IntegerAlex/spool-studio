import { NextResponse } from "next/server"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { renewCycle } from "@/services/service-cycles-service"
import { getOrCreateCurrentUserProfile } from "@/services/users-service"

interface RouteContext {
  params: Promise<{ cycleId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getOrCreateCurrentUserProfile()
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const params = await context.params
    const cycleId = params?.cycleId
    if (!cycleId) {
      return NextResponse.json(
        { error: "Cycle id is required" },
        { status: 400 },
      )
    }

    const body = await request.json()
    if (!body?.startDate || !body?.endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 },
      )
    }

    const newCycle = await renewCycle(cycleId, {
      startDate: body.startDate,
      endDate: body.endDate,
      reelsTarget: body.reelsTarget ?? 0,
      postersTarget: body.postersTarget ?? 0,
    })

    return NextResponse.json({ data: newCycle }, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to renew cycle"
    logProductionRuntimeError("api-cycles-renew", error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
