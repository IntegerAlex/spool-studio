import { NextResponse } from "next/server"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  cancelCycleService,
  completeCycleService,
  deleteCycleService,
  getCycleByIdService,
  updateCycleDeliverables,
} from "@/services/service-cycles-service"
import { getOrCreateCurrentUserProfile } from "@/services/users-service"

interface RouteContext {
  params: Promise<{ cycleId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const cycleId = params?.cycleId
    if (!cycleId) {
      return NextResponse.json(
        { error: "Cycle id is required" },
        { status: 400 },
      )
    }
    const cycle = await getCycleByIdService(cycleId)
    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 })
    }
    return NextResponse.json({ data: cycle })
  } catch (error) {
    logProductionRuntimeError("api-cycles-id-get", error)
    return NextResponse.json({ data: null })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
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
    const action = body?.action

    if (action === "complete") {
      await completeCycleService(cycleId)
      return NextResponse.json({ data: true })
    }

    if (action === "cancel") {
      await cancelCycleService(cycleId)
      return NextResponse.json({ data: true })
    }

    if (action === "update") {
      const updated = await updateCycleDeliverables(cycleId, {
        startDate: body.startDate,
        endDate: body.endDate,
        reelsTarget: body.reelsTarget,
        postersTarget: body.postersTarget,
      })
      return NextResponse.json({ data: updated })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update cycle"
    logProductionRuntimeError("api-cycles-id-patch", error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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

    await deleteCycleService(cycleId)
    return NextResponse.json({ data: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete cycle"
    logProductionRuntimeError("api-cycles-id-delete", error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
