import { NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, readJsonBody } from "@/lib/api-error"
import { parseBody } from "@/lib/api-validation"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  createDayPlan,
  listDayPlans,
  listDesignerHistory,
} from "@/services/day-plans-service"

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const designerId = searchParams.get("designerId") ?? undefined
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    if (from && to && designerId) {
      const rows = await listDesignerHistory(designerId, from, to)
      return NextResponse.json({ data: rows })
    }

    const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10)
    const rows = await listDayPlans(date, designerId)
    return NextResponse.json({ data: rows })
  } catch (error) {
    logProductionRuntimeError("api-dayplans-get", error)
    return jsonError(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request)
    const dayPlanCreateSchema = z.object({
      date: dateString,
      designerId: z.string().uuid("designerId must be a valid id"),
      clientId: z.string().uuid("clientId must be a valid id"),
      cycleId: z.string().uuid().optional(),
      kind: z.enum(["reel", "poster"]),
      qty: z.number().int().min(1).max(20),
      referenceIds: z.array(z.string().uuid()).optional(),
    })
    const parsed = parseBody(dayPlanCreateSchema, body)
    if (!parsed.ok) {
      return parsed.response
    }
    const input = parsed.data

    const row = await createDayPlan({
      date: input.date,
      designerId: input.designerId,
      clientId: input.clientId,
      cycleId: input.cycleId,
      kind: input.kind,
      qty: input.qty,
      referenceIds: input.referenceIds ?? [],
    })

    return NextResponse.json({ data: row }, { status: 201 })
  } catch (error) {
    logProductionRuntimeError("api-dayplans-post", error)
    return jsonError(error)
  }
}
