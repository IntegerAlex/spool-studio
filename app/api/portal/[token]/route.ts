import { NextResponse } from "next/server"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { getPortalTokenByToken } from "@/repositories/portal-tokens-repository"
import { getPortalClientById } from "@/repositories/clients-repository"
import { listPortalAssetsByClientId } from "@/repositories/assets-repository"

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

    const portalToken = await getPortalTokenByToken(token)
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
      return NextResponse.json({ error: "Token has expired" }, { status: 401 })
    }

    const clientId = portalToken.client_id

    const client = await getPortalClientById(clientId)
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
