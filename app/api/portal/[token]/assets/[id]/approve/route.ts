import { NextResponse } from "next/server"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { getPortalTokenByToken } from "@/repositories/portal-tokens-repository"
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
      return NextResponse.json(
        { error: "Token and asset id are required" },
        { status: 400 },
      )
    }

    const portalToken = await getPortalTokenByToken(token)
    if (!portalToken) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      )
    }

    if (
      portalToken.expires_at &&
      new Date(portalToken.expires_at) < new Date()
    ) {
      return NextResponse.json({ error: "Token has expired" }, { status: 401 })
    }

    const asset = await getAssetById(assetId)
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    if (asset.client_id !== portalToken.client_id) {
      return NextResponse.json(
        { error: "Asset does not belong to this client" },
        { status: 403 },
      )
    }

    const body = await request.json()
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const decision = body.decision as string
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const comment = body.comment as string | undefined

    if (decision !== "approved" && decision !== "revision_requested") {
      return NextResponse.json(
        { error: 'Decision must be "approved" or "revision_requested"' },
        { status: 400 },
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
    const message =
      error instanceof Error ? error.message : "Failed to process decision"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
