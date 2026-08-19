import { NextResponse } from "next/server"
import { getPool } from "@/lib/db"
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

    const pool = getPool()

    const { rows: tokenRows } = await pool.query(
      `SELECT id, client_id, expires_at FROM portal_tokens WHERE token = $1`,
      [token],
    )

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

    const { rows: assetRows } = await pool.query(
      `SELECT id, client_id, status FROM content_assets WHERE id = $1`,
      [assetId],
    )

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
    const decision = body.decision as string
    const comment = body.comment as string | undefined

    if (decision !== "approved" && decision !== "revision_requested") {
      return NextResponse.json(
        { error: 'Decision must be "approved" or "revision_requested"' },
        { status: 400 },
      )
    }

    const updates: Record<string, unknown> = {}
    if (decision === "approved") {
      updates.status = "approved"
      updates.approved_at = new Date().toISOString()
    } else {
      updates.status = "revision_requested"
      updates.approved_at = null
      updates.approved_by = null
    }

    const setClauses = Object.keys(updates)
      .map((key, idx) => `${key} = $${idx + 1}`)
      .join(", ")
    const values = Object.values(updates)

    await pool.query(
      `UPDATE content_assets SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length + 1}`,
      [...values, assetId],
    )

    if (comment?.trim()) {
      await pool.query(
        `INSERT INTO asset_comments (id, asset_id, user_id, type, message, revision_status, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, NULL, 'comment', $2, NULL, NOW(), NOW())`,
        [assetId, `[Client Portal] ${comment}`],
      )
    }

    return NextResponse.json({ data: { success: true, decision } })
  } catch (error) {
    logProductionRuntimeError("api-portal-asset-approve", error)
    const message =
      error instanceof Error ? error.message : "Failed to process decision"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
