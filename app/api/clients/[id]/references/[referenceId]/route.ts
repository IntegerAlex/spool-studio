import { NextResponse } from "next/server"
import { z } from "zod"
import { ApiError, jsonError } from "@/lib/api-error"
import { parseBody } from "@/lib/api-validation"
import { requirePermission } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  removeClientReference,
  updateClientReference,
} from "@/services/client-references-service"

interface RouteContext {
  params: Promise<{ id: string; referenceId: string }>
}

const referenceTypeSchema = z.enum([
  "instagram",
  "website",
  "youtube",
  "pinterest",
  "drive_folder",
  "competitor",
  "branding",
  "reel_reference",
  "ad_reference",
  "other",
])

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requirePermission("clients:update")
    const params = await context.params
    const referenceId = params?.referenceId
    if (!referenceId) {
      throw ApiError.badRequest("Reference id is required")
    }

    const raw = await request.json()
    const referenceUpdateSchema = z.object({
      title: z.string().optional(),
      url: z.string().url().optional(),
      description: z.string().nullish(),
      type: referenceTypeSchema.optional(),
    })
    const parsed = parseBody(referenceUpdateSchema, raw)
    if (!parsed.ok) {
      return parsed.response
    }
    const body = parsed.data

    const reference = await updateClientReference(referenceId, {
      title: body.title,
      url: body.url,
      description: body.description,
      type: body.type,
    })

    return NextResponse.json({ data: reference })
  } catch (error) {
    logProductionRuntimeError("api-clients-references-patch", error)
    return jsonError(error)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requirePermission("clients:update")
    const params = await context.params
    const referenceId = params?.referenceId
    if (!referenceId) {
      throw ApiError.badRequest("Reference id is required")
    }

    await removeClientReference(referenceId)
    return NextResponse.json({ data: true })
  } catch (error) {
    logProductionRuntimeError("api-clients-references-delete", error)
    return jsonError(error)
  }
}
