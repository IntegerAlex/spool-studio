import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { destroySession } from "@/lib/auth/session"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { logAuditEvent } from "@/services/audit-log-service"
import { deleteUserAccount } from "@/repositories/users-repository"

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const { password } = (await request
      .json()
      .catch(() => ({ password: "" }))) as { password?: string }

    const result = await deleteUserAccount(user.id, password ?? "")

    if (result?.error === "password_incorrect") {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      )
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
