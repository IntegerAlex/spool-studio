import { NextResponse } from "next/server"
import { z } from "zod"
import { parseBody } from "@/lib/api-validation"
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
      "private, max-age=10, stale-while-revalidate=30",
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
    const assetCreateSchema = z.object({
      clientId: z.string().uuid("Client must be a valid id"),
      title: z.string().optional(),
      type: z.enum(["reel", "poster"]),
      // SAFETY: assetStatusValues is the exhaustive readonly AssetStatus tuple; spread satisfies z.enum's mutable tuple requirement.
      status: z.enum([...assetStatusValues] as [AssetStatus, ...AssetStatus[]]).optional(),
      driveFileUrl: z.string().url().nullish(),
      thumbnailUrl: z.string().url().nullish(),
      assignedTo: z.string().uuid().nullish(),
      scheduledAt: z.coerce.date().nullish(),
      publishDate: z.coerce.date().nullish(),
      publishTime: z
        .string()
        .regex(/^\d{2}:\d{2}(:\d{2})?$/, "publishTime must be HH:MM or HH:MM:SS")
        .nullish(),
      scheduledBy: z.string().uuid().nullish(),
      publishedAt: z.coerce.date().nullish(),
      approvedAt: z.coerce.date().nullish(),
      approvedBy: z.string().uuid().nullish(),
    })
    const parsed = parseBody(assetCreateSchema, body)
    if (!parsed.ok) {
      console.warn("[api/assets] validation error", {
        issues: parsed.response,
      })
      return parsed.response
    }
    const input = parsed.data

    const payload = {
      clientId: input.clientId,
      title: input.title,
      type: input.type,
      status: input.status,
      driveFileUrl: input.driveFileUrl ?? undefined,
      thumbnailUrl: input.thumbnailUrl ?? undefined,
      assignedTo: input.assignedTo ?? null,
      scheduledAt: input.scheduledAt?.toISOString() ?? null,
      publishDate: input.publishDate
        ? input.publishDate.toISOString().slice(0, 10)
        : null,
      publishTime: input.publishTime ?? null,
      scheduledBy: input.scheduledBy ?? null,
      publishedAt: input.publishedAt?.toISOString() ?? null,
      approvedAt: input.approvedAt?.toISOString() ?? null,
      approvedBy: input.approvedBy ?? null,
    }
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
