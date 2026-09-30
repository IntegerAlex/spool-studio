import { NextResponse } from "next/server"
import { z } from "zod"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { parseBody } from "@/lib/api-validation"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  removeDayPlan,
  updateDayPlanDetails,
  updateDayPlanStatus,
} from "@/services/day-plans-service"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const id = params?.id
    if (!id) {
      throw ApiError.badRequest("Day plan id is required")
    }

    const body = await readJsonBody(request)
    const dayPlanUpdateSchema = z.object({
      status: z.enum(["pending", "in_progress", "done"]).optional(),
      qty: z.number().int().min(1).max(20).optional(),
      kind: z.enum(["reel", "poster"]).optional(),
      referenceIds: z.array(z.string().uuid()).optional(),
      designerId: z.string().uuid().optional(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
        .optional(),
    })
    const parsed = parseBody(dayPlanUpdateSchema, body)
    if (!parsed.ok) {
      return parsed.response
    }
    const input = parsed.data

    let updated = input.status
      ? await updateDayPlanStatus(id, input.status)
      : null
    if (
      input.qty !== undefined ||
      input.kind ||
      input.referenceIds ||
      input.designerId ||
      input.date
    ) {
      updated = await updateDayPlanDetails(id, {
        qty: input.qty,
        kind: input.kind,
        referenceIds: input.referenceIds,
        designerId: input.designerId,
        date: input.date,
      })
    }
    if (!updated) {
      throw ApiError.badRequest("No fields to update")
    }
    return NextResponse.json({ data: updated })
  } catch (error) {
    logProductionRuntimeError("api-dayplans-id-patch", error)
    return jsonError(error)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const id = params?.id
    if (!id) {
      throw ApiError.badRequest("Day plan id is required")
    }

    await removeDayPlan(id)
    return NextResponse.json({ data: true })
  } catch (error) {
    logProductionRuntimeError("api-dayplans-id-delete", error)
    return jsonError(error)
  }
}
