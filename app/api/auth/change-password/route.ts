import { NextResponse } from "next/server"
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { logAuditEvent } from "@/services/audit-log-service"
import { getUserById, updateUser } from "@/repositories/users-repository"

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 },
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 },
      )
    }

    const existing = await getUserById(user.id)
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const passwordHash = existing.password_hash
    if (!passwordHash) {
      return NextResponse.json(
        { error: "No password set for this account" },
        { status: 400 },
      )
    }

    const valid = await verifyPassword(currentPassword, passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      )
    }

    const newHash = await hashPassword(newPassword)
    await updateUser(user.id, { password_hash: newHash })

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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
