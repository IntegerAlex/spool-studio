import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  insertPortalToken,
  listActivePortalTokensWithClientName,
} from "@/repositories/portal-tokens-repository"

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

    const created = await insertPortalToken({
      client_id: clientId,
      token: crypto.randomUUID(),
      expires_at: expiresAt,
      created_by: user.id,
    })

    return NextResponse.json(
      {
        data: {
          id: created.id,
          client_id: created.client_id,
          token: created.token,
          expires_at: created.expires_at,
          created_at: created.created_at,
        },
      },
      { status: 201 },
    )
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

    const rows = await listActivePortalTokensWithClientName()

    return NextResponse.json({ data: rows })
  } catch (error) {
    logProductionRuntimeError("api-portal-token-get", error)
    return NextResponse.json({ data: [] })
  }
}
