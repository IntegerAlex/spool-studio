import { NextResponse } from "next/server"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { renewCycle } from "@/services/service-cycles-service"

interface RouteContext {
  params: Promise<{ cycleId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    if (user.role !== "admin") {
      throw ApiError.forbidden()
    }

    const params = await context.params
    const cycleId = params?.cycleId
    if (!cycleId) {
      throw ApiError.badRequest("Cycle id is required")
    }

    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const body = (await readJsonBody(request)) as {
      startDate?: string
      endDate?: string
      reelsTarget?: number
      postersTarget?: number
    }
    if (!body?.startDate || !body?.endDate) {
      throw ApiError.badRequest("startDate and endDate are required")
    }

    const newCycle = await renewCycle(cycleId, {
      startDate: body.startDate,
      endDate: body.endDate,
      reelsTarget: body.reelsTarget ?? 0,
      postersTarget: body.postersTarget ?? 0,
    })

    return NextResponse.json({ data: newCycle }, { status: 201 })
  } catch (error) {
    logProductionRuntimeError("api-cycles-renew", error)
    return jsonError(error)
  }
}
