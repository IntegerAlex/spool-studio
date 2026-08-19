import { NextResponse } from "next/server"
import { hashPassword, verifyToken } from "@/lib/auth"
import { getPool } from "@/lib/db"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

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

    const pool = getPool()
    const { rows } = await pool.query(
      "SELECT id FROM password_reset_tokens WHERE user_id = $1 AND token = $2 AND used = false AND expires_at > NOW()",
      [decoded.sub, token],
    )

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 },
      )
    }

    const passwordHash = await hashPassword(password)

    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      passwordHash,
      decoded.sub,
    ])
    await pool.query(
      "UPDATE password_reset_tokens SET used = true WHERE user_id = $1",
      [decoded.sub],
    )

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
