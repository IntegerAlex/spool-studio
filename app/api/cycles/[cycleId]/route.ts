import { NextResponse } from "next/server"
import { z } from "zod"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { parseBody } from "@/lib/api-validation"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  cancelCycleService,
  completeCycleService,
  deleteCycleService,
  getCycleByIdService,
  updateCycleDeliverables,
} from "@/services/service-cycles-service"

interface RouteContext {
  params: Promise<{ cycleId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const cycleId = params?.cycleId
    if (!cycleId) {
      throw ApiError.badRequest("Cycle id is required")
    }
    const cycle = await getCycleByIdService(cycleId)
    if (!cycle) {
      throw ApiError.notFound("Cycle not found")
    }
    return NextResponse.json({ data: cycle })
  } catch (error) {
    logProductionRuntimeError("api-cycles-id-get", error)
    return jsonError(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
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

    const body = await readJsonBody(request)
    const cycleActionSchema = z.object({
      action: z.string(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      reelsTarget: z.number().int().nonnegative().optional(),
      postersTarget: z.number().int().nonnegative().optional(),
    })
    const parsed = parseBody(cycleActionSchema, body)
    if (!parsed.ok) {
      return parsed.response
    }
    const input = parsed.data

    const action = input.action

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
        startDate: input.startDate
          ? input.startDate.toISOString().slice(0, 10)
          : undefined,
        endDate: input.endDate
          ? input.endDate.toISOString().slice(0, 10)
          : undefined,
        reelsTarget: input.reelsTarget,
        postersTarget: input.postersTarget,
      })
      return NextResponse.json({ data: updated })
    }

    throw ApiError.badRequest("Invalid action")
  } catch (error) {
    logProductionRuntimeError("api-cycles-id-patch", error)
    return jsonError(error)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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

    await deleteCycleService(cycleId)
    return NextResponse.json({ data: true })
  } catch (error) {
    logProductionRuntimeError("api-cycles-id-delete", error)
    return jsonError(error)
  }
}
