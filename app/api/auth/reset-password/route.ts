import { NextResponse } from "next/server"
import { hashPassword, verifyToken } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { updateUser } from "@/repositories/users-repository"
import {
  deletePasswordResetsByUserId,
  getPasswordResetByTokenHash,
} from "@/repositories/password-resets-repository"

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 },
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      )
    }

    const decoded = await verifyToken(token)
    if (!decoded?.sub) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 },
      )
    }

    const reset = await getPasswordResetByTokenHash(token)

    if (
      !reset ||
      reset.user_id !== decoded.sub ||
      reset.expires_at <= new Date()
    ) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 },
      )
    }

    const passwordHash = await hashPassword(password)

    await updateUser(decoded.sub, { password_hash: passwordHash })
    await deletePasswordResetsByUserId(decoded.sub)

    return NextResponse.json({
      message: "Password has been reset successfully.",
    })
  } catch (error) {
    logProductionRuntimeError("api-auth-reset-password", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
