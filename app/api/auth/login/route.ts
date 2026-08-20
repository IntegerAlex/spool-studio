import { NextResponse } from "next/server"
import { verifyPassword } from "@/lib/auth/password"
import { createSession } from "@/lib/auth/session"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { logAuditEvent } from "@/services/audit-log-service"
import { getUserByEmail } from "@/repositories/users-repository"

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

    const user = await getUserByEmail(email)

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      )
    }

    if (!user.password_hash) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      )
    }

    const valid = await verifyPassword(password, user.password_hash)
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
