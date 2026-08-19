import { NextResponse } from "next/server"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  removeClientReference,
  updateClientReference,
} from "@/services/client-references-service"

interface RouteContext {
  params: Promise<{ id: string; referenceId: string }>
}

const allowedTypes = [
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
]

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const referenceId = params?.referenceId
    if (!referenceId) {
      return NextResponse.json(
        { error: "Reference id is required" },
        { status: 400 },
      )
    }

    const body = await request.json()
    if (body.type && !allowedTypes.includes(body.type)) {
      return NextResponse.json(
        { error: "Invalid reference type" },
        { status: 400 },
      )
    }

    const reference = await updateClientReference(referenceId, {
      title: body.title,
      url: body.url,
      description: body.description,
      type: body.type,
    })

    return NextResponse.json({ data: reference })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update reference"
    logProductionRuntimeError("api-clients-references-patch", error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const referenceId = params?.referenceId
    if (!referenceId) {
      return NextResponse.json(
        { error: "Reference id is required" },
        { status: 400 },
      )
    }

    await removeClientReference(referenceId)
    return NextResponse.json({ data: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete reference"
    logProductionRuntimeError("api-clients-references-delete", error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
