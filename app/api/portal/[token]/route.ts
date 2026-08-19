import { NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const token = params?.token
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
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

    const clientId = portalToken.client_id

    const { rows: clientRows } = await pool.query(
      `SELECT id, name, slug, instagram_handle, brand_color FROM clients WHERE id = $1`,
      [clientId],
    )

    if (clientRows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    const { rows: assetRows } = await pool.query(
      `SELECT id, title, type, status, thumbnail_url, drive_file_url,
              mime_type, file_size, created_at, updated_at
       FROM content_assets
       WHERE client_id = $1 AND status IN ('uploaded', 'ready_for_review', 'revision_requested', 'approved')
       ORDER BY created_at DESC`,
      [clientId],
    )

    return NextResponse.json({
      data: {
        client: clientRows[0],
        assets: assetRows,
      },
    })
  } catch (error) {
    logProductionRuntimeError("api-portal-token-get", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
