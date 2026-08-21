import { NextResponse } from "next/server"
import { z } from "zod"
import { ApiError, jsonError } from "@/lib/api-error"
import { parseBody } from "@/lib/api-validation"
import { requireUser } from "@/lib/auth"
import { assetStatusValues } from "@/lib/asset-workflow"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  getAssetDetail,
  removeAsset,
  setAssetCurrentRevision,
  updateAsset,
} from "@/services/assets-service"
import type { AssetStatus, Json } from "@/types/index"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const assetId = params?.id
    if (!assetId) {
      throw ApiError.badRequest("Asset id is required")
    }
    const asset = await getAssetDetail(assetId)
    if (!asset) {
      throw ApiError.notFound("Asset not found")
    }
    return NextResponse.json({ data: asset })
  } catch (error) {
    logProductionRuntimeError("api-assets-id-get", error)
    return jsonError(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const assetId = params?.id
    if (!assetId) {
      throw ApiError.badRequest("Asset id is required")
    }
    const raw = await request.json()
    const assetUpdateSchema = z.object({
      currentRevisionId: z.string().optional(),
      clientId: z.string().uuid().optional(),
      title: z.string().optional(),
      type: z.enum(["reel", "poster"]).optional(),
      // SAFETY: assetStatusValues is the exhaustive readonly AssetStatus tuple; spread satisfies z.enum's mutable tuple requirement.
      status: z.enum([...assetStatusValues] as [AssetStatus, ...AssetStatus[]]).optional(),
      driveFileUrl: z.string().url().nullish(),
      thumbnailUrl: z.string().url().nullish(),
      assignedTo: z.string().uuid().nullish(),
      scheduledAt: z.string().nullish(),
      publishDate: z.string().nullish(),
      publishTime: z
        .string()
        .regex(/^\d{2}:\d{2}(:\d{2})?$/, "publishTime must be HH:MM or HH:MM:SS")
        .nullish(),
      scheduledBy: z.string().uuid().nullish(),
      publishedAt: z.string().nullish(),
      approvedAt: z.string().nullish(),
      approvedBy: z.string().uuid().nullish(),
      recurrence: z.unknown().optional(),
    })
    const parsed = parseBody(assetUpdateSchema, raw)
    if (!parsed.ok) {
      return parsed.response
    }
    const body = parsed.data
    // If the request asks to activate a specific revision, handle that first.
    if (body.currentRevisionId) {
      await setAssetCurrentRevision(assetId, body.currentRevisionId)
    }
    const asset = await updateAsset(assetId, {
      clientId: body.clientId,
      title: body.title,
      type: body.type,
      status: body.status,
      driveFileUrl: body.driveFileUrl ?? undefined,
      thumbnailUrl: body.thumbnailUrl ?? undefined,
      assignedTo: body.assignedTo,
      scheduledAt: body.scheduledAt,
      publishDate: body.publishDate,
      publishTime: body.publishTime,
      scheduledBy: body.scheduledBy,
      publishedAt: body.publishedAt,
      approvedAt: body.approvedAt,
      approvedBy: body.approvedBy,
      // SAFETY: parsed JSON values satisfy the recursive Json union by construction.
      recurrence: body.recurrence as Json | undefined,
    })
    return NextResponse.json({ data: asset })
  } catch (error) {
    logProductionRuntimeError("api-assets-id-patch", error)
    return jsonError(error)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser()
    if (user.role !== "admin") {
      throw ApiError.forbidden()
    }

    const params = await context.params
    const assetId = params?.id
    if (!assetId) {
      throw ApiError.badRequest("Asset id is required")
    }
    await removeAsset(assetId)
    return NextResponse.json({ data: true })
  } catch (error) {
    logProductionRuntimeError("api-assets-id-delete", error)
    return jsonError(error)
  }
}
