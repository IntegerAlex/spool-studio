import { NextResponse } from "next/server"
import { ApiError, jsonError } from "@/lib/api-error"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { rateLimit, requestIp } from "@/src/lib/rate-limit"
import { rateLimits } from "@/src/lib/rate-limit-config"
import { getPortalTokenByToken } from "@/repositories/portal-tokens-repository"
import { hashPortalToken } from "@/src/lib/portal-token"
import { getPortalClientById } from "@/repositories/clients-repository"
import { listPortalAssetsByClientId } from "@/repositories/assets-repository"

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const token = params?.token
    if (!token) {
      throw ApiError.badRequest("Token is required")
    }

    const limit = rateLimit(`portal-view:${token}`, rateLimits.portalView())
    if (!limit.ok) {
      throw ApiError.tooManyRequests(limit.retryAfterSeconds)
    }
    void requestIp // per-token keying; IP helper documented for per-IP limits

    const portalToken = await getPortalTokenByToken(hashPortalToken(token))
    if (!portalToken) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      )
    }

    if (
      portalToken.expires_at &&
      new Date(portalToken.expires_at) < new Date()
    ) {
      throw ApiError.unauthorized("Token has expired")
    }

    const clientId = portalToken.client_id

    const client = await getPortalClientById(clientId)
    if (!client) {
      throw ApiError.notFound("Client not found")
    }

    const assets = await listPortalAssetsByClientId(clientId)

    return NextResponse.json({
      data: {
        client,
        assets,
      },
    })
  } catch (error) {
    logProductionRuntimeError("api-portal-token-get", error)
    return jsonError(error)
  }
}
