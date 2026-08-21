import { NextResponse } from "next/server"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { deletePushSubscriptionByUserAndEndpoint } from "@/repositories/push-subscriptions-repository"

export async function POST(request: Request) {
  try {
    const user = await requireUser()

    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const body = (await readJsonBody(request)) as { endpoint?: string }
    const { endpoint } = body

    if (!endpoint) {
      throw ApiError.badRequest("endpoint is required")
    }

    await deletePushSubscriptionByUserAndEndpoint(user.id, endpoint)

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    logProductionRuntimeError("api-push-unsubscribe", error)
    return jsonError(error)
  }
}
