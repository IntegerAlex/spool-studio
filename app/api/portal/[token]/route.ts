import { and, desc, eq, inArray } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { clients, contentAssets, portalTokens } from "@/db/schema"
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

    const clientId = portalToken.client_id

    const clientRows = await db
      .select({
        id: clients.id,
        name: clients.name,
        slug: clients.slug,
        instagram_handle: clients.instagram_handle,
        brand_color: clients.brand_color,
      })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1)

    if (clientRows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    const assetRows = await db
      .select({
        id: contentAssets.id,
        title: contentAssets.title,
        type: contentAssets.type,
        status: contentAssets.status,
        thumbnail_url: contentAssets.thumbnail_url,
        drive_file_url: contentAssets.drive_file_url,
        mime_type: contentAssets.mime_type,
        file_size: contentAssets.file_size,
        created_at: contentAssets.created_at,
        updated_at: contentAssets.updated_at,
      })
      .from(contentAssets)
      .where(
        and(
          eq(contentAssets.client_id, clientId),
          inArray(contentAssets.status, [
            "uploaded",
            "ready_for_review",
            "revision_requested",
            "approved",
          ]),
        ),
      )
      .orderBy(desc(contentAssets.created_at))

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
