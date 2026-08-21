import { NextResponse } from "next/server"
import {
  ApiError,
  jsonError,
  readJsonBody,
} from "@/lib/api-error"
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { logAuditEvent } from "@/services/audit-log-service"
import { getUserById, updateUser } from "@/repositories/users-repository"

export async function POST(request: Request) {
  try {
    const user = await requireUser()

    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const body = (await readJsonBody(request)) as {
      currentPassword?: string
      newPassword?: string
    }
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      throw ApiError.badRequest(
        "Current password and new password are required",
      )
    }

    if (newPassword.length < 8) {
      throw ApiError.badRequest("New password must be at least 8 characters")
    }

    const existing = await getUserById(user.id)
    if (!existing) {
      throw ApiError.notFound("User not found")
    }

    const passwordHash = existing.password_hash
    if (!passwordHash) {
      throw ApiError.badRequest("No password set for this account")
    }

    const valid = await verifyPassword(currentPassword, passwordHash)
    if (!valid) {
      throw ApiError.badRequest("Current password is incorrect")
    }

    const newHash = await hashPassword(newPassword)
    // Bumping token_version invalidates every JWT issued before this change.
    await updateUser(user.id, {
      password_hash: newHash,
      token_version: existing.token_version + 1,
    })

    try {
      await logAuditEvent({
        action: "password_changed",
        entityType: "user",
        entityId: user.id,
        entityName: user.email ?? user.name ?? "",
      })
    } catch {
      // Audit logging should not block password change.
    }

    return NextResponse.json({ message: "Password updated successfully" })
  } catch (error) {
    logProductionRuntimeError("api-auth-change-password", error)
    return jsonError(error)
  }
}
