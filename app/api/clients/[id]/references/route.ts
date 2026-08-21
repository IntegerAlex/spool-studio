import { NextResponse } from "next/server"
import { z } from "zod"
import { ApiError, jsonError } from "@/lib/api-error"
import { parseBody } from "@/lib/api-validation"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  createClientReference,
  getClientReferences,
} from "@/services/client-references-service"

interface RouteContext {
  params: Promise<{ id: string }>
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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const clientId = params?.id
    if (!clientId) {
      throw ApiError.badRequest("Client id is required")
    }

    const references = await getClientReferences(clientId)
    return NextResponse.json({ data: references })
  } catch (error) {
    logProductionRuntimeError("api-clients-references-get", error)
    return jsonError(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const clientId = params?.id
    if (!clientId) {
      throw ApiError.badRequest("Client id is required")
    }

    const raw = await request.json()
    const referenceCreateSchema = z.object({
      title: z.string().min(1, "Title is required"),
      url: z.string().url("URL must be valid"),
      description: z.string().nullish(),
      type: referenceTypeSchema.optional(),
    })
    const parsed = parseBody(referenceCreateSchema, raw)
    if (!parsed.ok) {
      return parsed.response
    }
    const body = parsed.data

    const reference = await createClientReference({
      clientId,
      title: body.title,
      url: body.url,
      description: body.description,
      type: body.type,
    })

    return NextResponse.json({ data: reference }, { status: 201 })
  } catch (error) {
    logProductionRuntimeError("api-clients-references-post", error)
    return jsonError(error)
  }
}
