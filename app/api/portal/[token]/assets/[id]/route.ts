import { NextResponse } from "next/server"
import { ApiError, jsonError } from "@/lib/api-error"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { getPortalTokenByToken } from "@/repositories/portal-tokens-repository"
import { hashPortalToken } from "@/src/lib/portal-token"
import { getAssetById } from "@/repositories/assets-repository"
import { listAssetRevisionsByAssetId } from "@/repositories/asset-revisions-repository"
import { getClientById } from "@/repositories/clients-repository"
import { listCommentsByAssetId } from "@/repositories/asset-comments-repository"
import { listUsersByIds } from "@/repositories/users-repository"

interface RouteContext {
  params: Promise<{ token: string; id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const token = params?.token
    const assetId = params?.id

    if (!token || !assetId) {
      throw ApiError.badRequest("Token and asset id are required")
    }

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
    if (!asset || asset.client_id !== portalToken.client_id) {
      throw ApiError.notFound("Asset not found")
    }

    const client = await getClientById(portalToken.client_id)
    if (!client) {
      throw ApiError.notFound("Client not found")
    }

    const comments = await listCommentsByAssetId(assetId, { limit: 50 })
    const revisions = (await listAssetRevisionsByAssetId(assetId)).slice(0, 10)

    const userIds = new Set<string>()
    comments.forEach((c) => {
      if (c.user_id) userIds.add(c.user_id)
    })
    revisions.forEach((r) => {
      if (r.uploaded_by) userIds.add(r.uploaded_by)
    })

    const userRows = userIds.size ? await listUsersByIds([...userIds]) : []
    const userMap = new Map(
      userRows.map((u) => [
        u.id,
        { id: u.id, full_name: u.full_name, avatar_url: u.avatar_url },
      ]),
    )

    return NextResponse.json({
      client,
      asset,
      comments: comments.map((c) => ({
        ...c,
        user: c.user_id ? (userMap.get(c.user_id) ?? null) : null,
      })),
      revisions: revisions.map((r) => ({
        ...r,
        user: r.uploaded_by ? (userMap.get(r.uploaded_by) ?? null) : null,
      })),
    })
  } catch (error) {
    logProductionRuntimeError("api-portal-asset-detail", error)
    return jsonError(error)
  }
}
