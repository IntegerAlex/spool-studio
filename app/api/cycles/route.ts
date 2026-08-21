import { NextResponse } from "next/server"
import { z } from "zod"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { parseBody } from "@/lib/api-validation"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  createCycle,
  getCyclesByClientId,
} from "@/services/service-cycles-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")

    if (!clientId) {
      throw ApiError.badRequest("clientId is required")
    }

    const cycles = await getCyclesByClientId(clientId)
    return NextResponse.json({ data: cycles })
  } catch (error) {
    logProductionRuntimeError("api-cycles-get", error)
    return jsonError(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request)
    const cycleCreateSchema = z.object({
      clientId: z.string().uuid("clientId must be a valid id"),
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      reelsTarget: z.number().int().nonnegative().optional(),
      postersTarget: z.number().int().nonnegative().optional(),
    })
    const parsed = parseBody(cycleCreateSchema, body)
    if (!parsed.ok) {
      return parsed.response
    }
    const input = parsed.data

    const cycle = await createCycle({
      clientId: input.clientId,
      startDate: input.startDate.toISOString().slice(0, 10),
      endDate: input.endDate.toISOString().slice(0, 10),
      reelsTarget: input.reelsTarget ?? 0,
      postersTarget: input.postersTarget ?? 0,
    })

    return NextResponse.json({ data: cycle }, { status: 201 })
  } catch (error) {
    logProductionRuntimeError("api-cycles-post", error)
    return jsonError(error)
  }
}
