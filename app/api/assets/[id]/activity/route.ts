import { NextResponse } from "next/server"
import { ApiError, jsonError } from "@/lib/api-error"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  getAssetActivity,
  getAssetActivityWithUsers,
} from "@/services/activity-service"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const assetId = params?.id
    if (!assetId) {
      throw ApiError.badRequest("Asset id is required")
    }

    const { searchParams } = new URL(_request.url)
    const includeUsers = searchParams.get("includeUsers") === "1"
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? Number(limitParam) : undefined

    if (includeUsers) {
      const payload = await getAssetActivityWithUsers(assetId, { limit })
      return NextResponse.json({ data: payload })
    }

    const activity = await getAssetActivity(assetId, { limit })
    return NextResponse.json({ data: activity })
  } catch (error) {
    logProductionRuntimeError("api-assets-activity-get", error)
    return jsonError(error)
  }
}
