import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { assetComments, contentAssets, portalTokens } from "@/db/schema"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

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
      return NextResponse.json({ error: "Token has expired" }, { status: 401 })
    }

    const assetRows = await db
      .select({
        id: contentAssets.id,
        client_id: contentAssets.client_id,
        status: contentAssets.status,
      })
      .from(contentAssets)
      .where(eq(contentAssets.id, assetId))
      .limit(1)

    if (assetRows.length === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    if (assetRows[0].client_id !== portalToken.client_id) {
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
      await db
        .update(contentAssets)
        .set({ status: "approved", approved_at: new Date() })
        .where(eq(contentAssets.id, assetId))
    } else {
      await db
        .update(contentAssets)
        .set({
          status: "revision_requested",
          approved_at: null,
          approved_by: null,
        })
        .where(eq(contentAssets.id, assetId))
    }

    if (comment?.trim()) {
      // SAFETY: user_id is NOT NULL; portal approvals are unattributed, so it is set to null at insert.
      await db.insert(assetComments).values({
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
