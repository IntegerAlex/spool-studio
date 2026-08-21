import { NextResponse } from "next/server"
import { verifyPassword } from "@/lib/auth/password"
import { createSession } from "@/lib/auth/session"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { rateLimit, requestIp } from "@/src/lib/rate-limit"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { logAuditEvent } from "@/services/audit-log-service"
import { getUserByEmail } from "@/repositories/users-repository"

export async function POST(request: Request) {

  try {
  const ip = requestIp(request)
  const limit = rateLimit(`login:${ip}`, { limit: 5, windowMs: 60_000 })
  if (!limit.ok) {
    throw ApiError.tooManyRequests(limit.retryAfterSeconds)
  }
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const body = (await readJsonBody(request)) as {
      email?: string
      password?: string
    }
    const email = body.email?.trim()
    const password = body.password?.trim()

    if (!email || !password) {
      throw ApiError.badRequest("Email and password are required")
    }

    const user = await getUserByEmail(email)

    if (!user) {
      throw ApiError.unauthorized("Invalid credentials")
    }

    if (!user.password_hash) {
      throw ApiError.unauthorized("Invalid credentials")
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      throw ApiError.unauthorized("Invalid credentials")
    }

    const session = await createSession(
      {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
      },
      user.token_version,
    )

    const response = NextResponse.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
        },
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
    return jsonError(error)
  }
}
