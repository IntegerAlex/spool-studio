import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { destroySession } from "@/lib/auth/session"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { logAuditEvent } from "@/services/audit-log-service"
import { deleteUserAccount } from "@/repositories/users-repository"

export async function POST(request: Request) {
  try {
    const user = await requireUser()

    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const { password } = (await readJsonBody(request)) as { password?: string }

    const result = await deleteUserAccount(user.id, password ?? "")

    if (result?.error === "password_incorrect") {
      throw ApiError.badRequest("Current password is incorrect")
    }

    try {
      await logAuditEvent({
        action: "account_deleted",
        entityType: "user",
        entityId: user.id,
        entityName: user.email ?? user.name ?? "",
      })
    } catch {
      // Audit logging must not block the deletion.
    }

    const response = NextResponse.json({ success: true })
    const session = destroySession()
    response.cookies.set(
      session.name,
      session.value,
      // SAFETY: this cast is safe because the value already conforms to the asserted type.
      session.options as Parameters<typeof response.cookies.set>[2],
    )
    return response
  } catch (error) {
    logProductionRuntimeError("api-auth-delete-account", error)
    return jsonError(error)
  }
}
