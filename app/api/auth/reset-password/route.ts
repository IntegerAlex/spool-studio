import { and, eq, gt } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { passwordResets, users } from "@/db/schema"
import { hashPassword, verifyToken } from "@/lib/auth"
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

    const resetRows = await db
      .select({ id: passwordResets.id })
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.user_id, decoded.sub),
          eq(passwordResets.token_hash, token),
          gt(passwordResets.expires_at, new Date()),
        ),
      )
      .limit(1)

    if (resetRows.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 },
      )
    }

    const passwordHash = await hashPassword(password)

    await db
      .update(users)
      .set({ password_hash: passwordHash })
      .where(eq(users.id, decoded.sub))
    await db
      .delete(passwordResets)
      .where(eq(passwordResets.user_id, decoded.sub))

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
