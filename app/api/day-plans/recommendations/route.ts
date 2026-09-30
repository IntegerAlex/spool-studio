import { NextResponse } from "next/server"
import { ApiError, jsonError } from "@/lib/api-error"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { recommendDayPlans } from "@/services/day-plans-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date =
      searchParams.get("date") ?? new Date().toISOString().slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw ApiError.badRequest("date must be YYYY-MM-DD")
    }
    const recs = await recommendDayPlans(date)
    return NextResponse.json({ data: recs })
  } catch (error) {
    logProductionRuntimeError("api-dayplans-recommendations-get", error)
    return jsonError(error)
  }
}
