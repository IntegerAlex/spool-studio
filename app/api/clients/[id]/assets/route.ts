import { NextResponse } from "next/server"
import { ApiError, jsonError } from "@/lib/api-error"
import { requirePermission } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { clearClientAssets } from "@/services/assets-service"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requirePermission("assets:delete")

    const params = await context.params
    const clientId = params?.id
    if (!clientId) {
      throw ApiError.badRequest("Client id is required")
    }

    const removed = await clearClientAssets(clientId)
    return NextResponse.json({ data: { removed } })
  } catch (error) {
    logProductionRuntimeError("api-clients-assets-delete", error)
    return jsonError(error)
  }
}
