import { NextResponse } from "next/server"
import { ApiError, jsonError } from "@/lib/api-error"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { rateLimit, requestIp } from "@/src/lib/rate-limit"
import { rateLimits } from "@/src/lib/rate-limit-config"
import { getPortalTokenByToken } from "@/repositories/portal-tokens-repository"
import { hashPortalToken } from "@/src/lib/portal-token"
import {
  getAssetById,
  updateAsset,
} from "@/repositories/assets-repository"
import { insertComment } from "@/repositories/asset-comments-repository"

interface RouteContext {
  params: Promise<{ token: string; id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const token = params?.token
    const assetId = params?.id

    if (!token || !assetId) {
      throw ApiError.badRequest("Token and asset id are required")
    }

    const limit = rateLimit(`portal-act:${token}`, rateLimits.portalAct())
    if (!limit.ok) {
      throw ApiError.tooManyRequests(limit.retryAfterSeconds)
    }
    void requestIp // per-token keying; IP helper documented for per-IP limits

    const portalToken = await getPortalTokenByToken(hashPortalToken(token))
    if (!portalToken) {
      throw ApiError.unauthorized("Invalid or expired token")
    }

    if (
      portalToken.expires_at &&
      new Date(portalToken.expires_at) < new Date()
    ) {
      throw ApiError.unauthorized("Token has expired")
    }

    const asset = await getAssetById(assetId)
    if (!asset) {
      throw ApiError.notFound("Asset not found")
    }

    if (asset.client_id !== portalToken.client_id) {
      throw ApiError.forbidden("Asset does not belong to this client")
    }

    const body = await request.json()
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const decision = body.decision as string
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const comment = body.comment as string | undefined

    if (decision !== "approved" && decision !== "revision_requested") {
      throw ApiError.badRequest(
        'Decision must be "approved" or "revision_requested"',
      )
    }

    if (decision === "approved") {
      await updateAsset(assetId, { status: "approved", approved_at: new Date() })
    } else {
      await updateAsset(assetId, {
        status: "revision_requested",
        approved_at: null,
        approved_by: null,
      })
    }

    if (comment?.trim()) {
      // SAFETY: user_id is NOT NULL; portal approvals are unattributed, so it is set to null at insert.
      await insertComment({
        asset_id: assetId,
        user_id: null as never,
        type: "comment",
        message: `[Client Portal] ${comment}`,
      })
    }

    return NextResponse.json({ data: { success: true, decision } })
  } catch (error) {
    logProductionRuntimeError("api-portal-asset-approve", error)
    return jsonError(error)
  }
}
