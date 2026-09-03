import { NextResponse } from "next/server"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { requirePermission } from "@/lib/rbac"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { approveAsset } from "@/services/assets-service"

export async function POST(request: Request) {
  try {
    const user = await requirePermission("assets:approve")

    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const body = (await readJsonBody(request)) as { assetId?: string }
    const assetId = body.assetId?.trim()
    if (!assetId) {
      throw ApiError.badRequest("assetId is required")
    }

    const updated = await approveAsset(assetId, user.id)

    return NextResponse.json({ data: updated })
  } catch (error) {
    logProductionRuntimeError("api-assets-approve", error)
    return jsonError(error)
  }
}
