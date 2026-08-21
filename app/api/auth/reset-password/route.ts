import { NextResponse } from "next/server"
import { hashPassword, verifyToken } from "@/lib/auth"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { updateUser } from "@/repositories/users-repository"
import {
  deletePasswordResetsByUserId,
  getPasswordResetByTokenHash,
} from "@/repositories/password-resets-repository"

export async function POST(request: Request) {
  try {
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const { token, password } = (await readJsonBody(request)) as {
      token?: string
      password?: string
    }

    if (!token || !password) {
      throw ApiError.badRequest("Token and password are required")
    }

    if (password.length < 8) {
      throw ApiError.badRequest("Password must be at least 8 characters")
    }

    const decoded = await verifyToken(token)
    if (!decoded?.sub) {
      throw ApiError.badRequest("Invalid or expired reset token")
    }

    const reset = await getPasswordResetByTokenHash(token)

    if (
      !reset ||
      reset.user_id !== decoded.sub ||
      reset.expires_at <= new Date()
    ) {
      throw ApiError.badRequest("Invalid or expired reset token")
    }

    const passwordHash = await hashPassword(password)

    await updateUser(decoded.sub, { password_hash: passwordHash })
    await deletePasswordResetsByUserId(decoded.sub)

    return NextResponse.json({
      message: "Password has been reset successfully.",
    })
  } catch (error) {
    logProductionRuntimeError("api-auth-reset-password", error)
    return jsonError(error)
  }
}
