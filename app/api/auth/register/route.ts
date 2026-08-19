import { NextResponse } from "next/server"
import { createSession, hashPassword } from "@/lib/auth"
import { getPool } from "@/lib/db"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { logAuditEvent } from "@/services/audit-log-service"

export async function POST(request: Request) {
  try {
    const { email, password, fullName, role } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      )
    }

    const pool = getPool()

    const passwordHash = await hashPassword(password)
    const userId = crypto.randomUUID()
    const validRoles = ["admin", "designer", "approver"]
    const userRole = validRoles.includes(role) ? role : "designer"

    try {
      await pool.query(
        `INSERT INTO users (id, email, full_name, role, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [
          userId,
          email,
          fullName || email.split("@")[0],
          userRole,
          passwordHash,
        ],
      )
    } catch (err: any) {
      if (err.code === "23505") {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 },
        )
      }
      throw err
    }

    const session = await createSession({
      id: userId,
      email,
      name: fullName || email.split("@")[0],
      role: userRole,
      avatarUrl: null,
    })

    const response = NextResponse.json(
      {
        user: {
          id: userId,
          email,
          name: fullName || email.split("@")[0],
          role: userRole,
        },
      },
      { status: 201 },
    )

    try {
      await logAuditEvent({
        action: "user_registered",
        entityType: "user",
        entityId: userId,
        entityName: email,
        metadata: { role: userRole },
      })
    } catch {
      // Audit logging should not block registration.
    }

    response.cookies.set(
      session.cookie.name,
      session.cookie.value,
// SAFETY: this cast is safe because the value already conforms to the asserted type.
      session.cookie.options as Parameters<typeof response.cookies.set>[2],
    )

    return response
  } catch (error) {
    logProductionRuntimeError("api-auth-register", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
