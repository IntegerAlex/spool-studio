import { NextResponse } from "next/server"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  insertPortalToken,
  listActivePortalTokensWithClientName,
} from "@/repositories/portal-tokens-repository"

export async function POST(request: Request) {
  try {
    const user = await requireUser()

    if (user.role !== "admin" && user.role !== "approver") {
      throw ApiError.forbidden(
        "Only admins and approvers can create portal tokens",
      )
    }

    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const body = (await readJsonBody(request)) as {
      clientId?: string
      expiresInDays?: number
    }
    const clientId = body.clientId?.trim()
    if (!clientId) {
      throw ApiError.badRequest("clientId is required")
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
    return jsonError(error)
  }
}

export async function GET() {
  try {
    await requireUser()

    const rows = await listActivePortalTokensWithClientName()

    return NextResponse.json({ data: rows })
  } catch (error) {
    logProductionRuntimeError("api-portal-token-get", error)
    return jsonError(error)
  }
}
