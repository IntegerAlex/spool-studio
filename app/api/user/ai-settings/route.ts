import { NextResponse } from "next/server"
import { jsonError, readJsonBody } from "@/lib/api-error"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  deleteAiSettings,
  getMaskedAiSettings,
  saveAiSettings,
  saveAiSettingsSchema,
} from "@/services/user-ai-settings-service"

/**
 * Per-user AI provider configuration. Any authenticated user manages their OWN
 * config only — never another user's. The stored API key is encrypted at rest
 * and never returned to the client (only a masked preview is).
 */

export async function GET() {
  try {
    const user = await requireUser()
    const data = await getMaskedAiSettings(user.id)
    return NextResponse.json({ data })
  } catch (error) {
    logProductionRuntimeError("api-user-ai-settings-get", error)
    return jsonError(error)
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser()
    const body = await readJsonBody(request)
    const parsed = saveAiSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false as const, error: "Invalid AI settings", issues: parsed.error.issues },
        { status: 400 },
      )
    }
    await saveAiSettings(user.id, parsed.data)
    const data = await getMaskedAiSettings(user.id)
    return NextResponse.json({ data })
  } catch (error) {
    logProductionRuntimeError("api-user-ai-settings-put", error)
    return jsonError(error)
  }
}

export async function DELETE() {
  try {
    const user = await requireUser()
    const deleted = await deleteAiSettings(user.id)
    return NextResponse.json({ data: { deleted } })
  } catch (error) {
    logProductionRuntimeError("api-user-ai-settings-delete", error)
    return jsonError(error)
  }
}
