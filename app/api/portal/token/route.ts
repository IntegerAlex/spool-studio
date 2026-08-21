import { NextResponse } from "next/server"
import { z } from "zod"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { parseBody } from "@/lib/api-validation"
import { requirePermission } from "@/lib/auth"
import { rateLimit } from "@/src/lib/rate-limit"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  insertPortalToken,
  listActivePortalTokensWithClientName,
} from "@/repositories/portal-tokens-repository"
import { generatePortalToken } from "@/src/lib/portal-token"

export async function POST(request: Request) {
  try {
    const user = await requirePermission("portal:manage")

    const userLimit = rateLimit(`portal-token-post:${user.id}`, {
      limit: 10,
      windowMs: 60 * 60_000,
    })
    if (!userLimit.ok) {
      throw ApiError.tooManyRequests(userLimit.retryAfterSeconds)
    }

    const Schema = z.object({
      clientId: z.string().uuid("clientId must be a valid id"),
      expiresInDays: z.number().int().min(1).max(365).default(30),
    })
    const parsed = parseBody(Schema, await readJsonBody(request))
    if (!parsed.ok) {
      return parsed.response
    }
    const clientId = parsed.data.clientId
    const expiresInDays = parsed.data.expiresInDays

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const { raw, hashed } = generatePortalToken()

    const created = await insertPortalToken({
      client_id: clientId,
      token: hashed,
      expires_at: expiresAt,
      created_by: user.id,
    })

    return NextResponse.json(
      {
        data: {
          id: created.id,
          client_id: created.client_id,
          token: raw,
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
    await requirePermission("portal:manage")

    const rows = await listActivePortalTokensWithClientName()

    return NextResponse.json({
      data: rows.map((row) => ({
        id: row.id,
        client_id: row.client_id,
        client_name: row.client_name,
        expires_at: row.expires_at,
        created_at: row.created_at,
        tokenPrefix: row.token.slice(0, 8),
      })),
    })
  } catch (error) {
    logProductionRuntimeError("api-portal-token-get", error)
    return jsonError(error)
  }
}
