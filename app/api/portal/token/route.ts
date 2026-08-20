import { desc, eq, gt, isNull, or } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { clients, portalTokens } from "@/db/schema"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "admin" && user.role !== "approver") {
      return NextResponse.json(
        { error: "Only admins and approvers can create portal tokens" },
        { status: 403 },
      )
    }

    const body = await request.json()
    const clientId = body.clientId?.trim()
    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 },
      )
    }

    const expiresInDays = body.expiresInDays ?? 30
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const rows = await db
      .insert(portalTokens)
      .values({
        client_id: clientId,
        token: crypto.randomUUID(),
        expires_at: expiresAt,
        created_by: user.id,
      })
      .returning({
        id: portalTokens.id,
        client_id: portalTokens.client_id,
        token: portalTokens.token,
        expires_at: portalTokens.expires_at,
        created_at: portalTokens.created_at,
      })

    return NextResponse.json({ data: rows[0] }, { status: 201 })
  } catch (error) {
    logProductionRuntimeError("api-portal-token-post", error)
    const message =
      error instanceof Error ? error.message : "Failed to create portal token"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function GET() {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rows = await db
      .select({
        id: portalTokens.id,
        client_id: portalTokens.client_id,
        token: portalTokens.token,
        expires_at: portalTokens.expires_at,
        created_at: portalTokens.created_at,
        client_name: clients.name,
      })
      .from(portalTokens)
      .innerJoin(clients, eq(clients.id, portalTokens.client_id))
      .where(
        or(
          isNull(portalTokens.expires_at),
          gt(portalTokens.expires_at, new Date()),
        ),
      )
      .orderBy(desc(portalTokens.created_at))

    return NextResponse.json({ data: rows })
  } catch (error) {
    logProductionRuntimeError("api-portal-token-get", error)
    return NextResponse.json({ data: [] })
  }
}
