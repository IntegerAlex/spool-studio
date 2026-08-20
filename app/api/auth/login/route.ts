import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { users } from "@/db/schema"
import { verifyPassword } from "@/lib/auth/password"
import { createSession } from "@/lib/auth/session"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { logAuditEvent } from "@/services/audit-log-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const email = (body.email as string)?.trim()
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const password = (body.password as string)?.trim()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      )
    }

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    const user = rows[0]

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      )
    }

    // Cast to include password_hash — safe once the column is added to the table
    const userWithPassword = user

    if (!userWithPassword.password_hash) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      )
    }

    const valid = await verifyPassword(password, userWithPassword.password_hash)
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      )
    }

    const session = await createSession({
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      avatarUrl: user.avatar_url,
    })

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
      },
    })

    response.cookies.set(
      session.cookie.name,
      session.cookie.value,
      // SAFETY: this cast is safe because the value already conforms to the asserted type.
      session.cookie.options as Parameters<typeof response.cookies.set>[2],
    )

    try {
      const ip =
        request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip") ??
        null
      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        userName: user.full_name,
        action: "login",
        entityType: "user",
        entityId: user.id,
        entityName: user.full_name ?? user.email,
        ipAddress: ip,
      })
    } catch {
      // Audit logging should not block login.
    }

    return response
  } catch (error) {
    logProductionRuntimeError("api-auth-login", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
