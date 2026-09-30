import { NextResponse } from "next/server"
import { z } from "zod"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { parseBody } from "@/lib/api-validation"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { getUserDetail, updateUserCapacity } from "@/services/users-service"

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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const userId = params?.id
    if (!userId) {
      throw ApiError.badRequest("User id is required")
    }

    const body = await readJsonBody(request)
    const parsed = parseBody(
      z.object({
        dailyCapacityUnits: z.number().int().min(1).max(20),
      }),
      body,
    )
    if (!parsed.ok) {
      return parsed.response
    }

    const updated = await updateUserCapacity(
      userId,
      parsed.data.dailyCapacityUnits,
    )
    return NextResponse.json({ data: updated })
  } catch (error) {
    logProductionRuntimeError("api-users-id-patch", error)
    return jsonError(error)
  }
}
