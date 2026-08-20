import { eq, inArray } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { portalTokens, users } from "@/db/schema"
import { getAssetById, listRevisionsByAssetId } from "@/repositories/assets-repository"
import { getClientById } from "@/repositories/clients-repository"
import { listCommentsByAssetId } from "@/repositories/asset-comments-repository"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

interface RouteContext {
  params: Promise<{ token: string; id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
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

    const tokenRows = await db
      .select({
        id: portalTokens.id,
        client_id: portalTokens.client_id,
        expires_at: portalTokens.expires_at,
      })
      .from(portalTokens)
      .where(eq(portalTokens.token, token))
      .limit(1)

    if (tokenRows.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      )
    }

    const portalToken = tokenRows[0]
    if (
      portalToken.expires_at &&
      new Date(portalToken.expires_at) < new Date()
    ) {
      return NextResponse.json(
        { error: "Token has expired" },
        { status: 401 },
      )
    }

    const asset = await getAssetById(assetId)
    if (!asset || asset.client_id !== portalToken.client_id) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 },
      )
    }

    const client = await getClientById(portalToken.client_id)
    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 },
      )
    }

    const comments = await listCommentsByAssetId(assetId, { limit: 50 })
    const revisions = (await listRevisionsByAssetId(assetId)).slice(0, 10)

    const userIds = new Set<string>()
    comments.forEach((c) => {
      if (c.user_id) userIds.add(c.user_id)
    })
    revisions.forEach((r) => {
      if (r.uploaded_by) userIds.add(r.uploaded_by)
    })

    const userRows = userIds.size
      ? await db
          .select({
            id: users.id,
            full_name: users.full_name,
            avatar_url: users.avatar_url,
          })
          .from(users)
          .where(inArray(users.id, [...userIds]))
      : []
    const userMap = new Map(userRows.map((u) => [u.id, u]))

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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
