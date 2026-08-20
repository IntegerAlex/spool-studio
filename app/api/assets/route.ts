import { NextResponse } from "next/server"
import { assetStatusValues } from "@/lib/asset-workflow"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  createAsset,
  getAssets,
  getAssetsByClientId,
  getAssetsByStatuses,
} from "@/services/assets-service"
import type { AssetStatus } from "@/types/index"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const statusesParam = searchParams.get("statuses")

    const limit = Math.min(parseInt(searchParams.get("limit") ?? "200", 10) || 200, 500)
    let assets
    if (statusesParam) {
      const statuses = statusesParam
        .split(",")
        .filter((s): s is AssetStatus =>
// SAFETY: this cast is safe because the value already conforms to the asserted type.
          assetStatusValues.includes(s as AssetStatus),
        )
      assets = await getAssetsByStatuses(statuses, limit)
    } else if (clientId) {
      assets = await getAssetsByClientId(clientId, limit)
    } else {
      assets = await getAssets(limit)
    }
    const response = NextResponse.json({ data: assets })
    response.headers.set(
      "Cache-Control",
      "public, max-age=30, stale-while-revalidate=60",
    )
    return response
  } catch (error) {
    logProductionRuntimeError("api-assets-get", error)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.info("[api/assets] create payload", body)
    if (!body?.clientId || !body?.type) {
      const error = "Client and type are required"
      console.warn("[api/assets] validation error", { error, body })
      return NextResponse.json({ success: false, error }, { status: 400 })
    }
    const allowedTypes = ["reel", "poster"]
    const allowedStatuses = [...assetStatusValues]
    if (!allowedTypes.includes(body.type)) {
      const error = `Invalid asset type: ${body.type}`
      console.warn("[api/assets] enum mismatch", { error, type: body.type })
      return NextResponse.json({ success: false, error }, { status: 400 })
    }
    if (body.status && !allowedStatuses.includes(body.status)) {
      const error = `Invalid status: ${body.status}`
      console.warn("[api/assets] enum mismatch", { error, status: body.status })
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    const payload = {
      clientId: body.clientId,
      title: body.title,
      type: body.type,
      status: body.status,
      driveFileUrl: body.driveFileUrl,
      thumbnailUrl: body.thumbnailUrl,
      assignedTo: body.assignedTo ?? null,
      scheduledAt: body.scheduledAt ?? null,
      publishDate: body.publishDate ?? null,
      publishTime: body.publishTime ?? null,
      scheduledBy: body.scheduledBy ?? null,
      publishedAt: body.publishedAt ?? null,
      approvedAt: body.approvedAt ?? null,
      approvedBy: body.approvedBy ?? null,
    }
    console.info("[api/assets] parsed payload", payload)
    const asset = await createAsset({
      clientId: payload.clientId,
      title: payload.title || "",
      type: payload.type,
      status: payload.status,
      driveFileUrl: payload.driveFileUrl,
      thumbnailUrl: payload.thumbnailUrl,
      assignedTo: payload.assignedTo,
      scheduledAt: payload.scheduledAt,
      publishDate: payload.publishDate,
      publishTime: payload.publishTime,
      scheduledBy: payload.scheduledBy,
      publishedAt: payload.publishedAt,
      approvedAt: payload.approvedAt,
      approvedBy: payload.approvedBy,
    })
    console.info("[api/assets] insert result", asset)
    return NextResponse.json({ success: true, data: asset }, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create asset"
    logProductionRuntimeError("api-assets-post", error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    )
  }
}
