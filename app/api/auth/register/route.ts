import { NextResponse } from "next/server"
import { createSession, hashPassword } from "@/lib/auth"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { logAuditEvent } from "@/services/audit-log-service"
import { insertUser } from "@/repositories/users-repository"
import type { UserRole } from "@/types"

export async function POST(request: Request) {
  try {
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const { email, password, fullName, role } = (await readJsonBody(request)) as {
      email?: string
      password?: string
      fullName?: string
      role?: string
    }

    if (!email || !password) {
      throw ApiError.badRequest("Email and password are required")
    }

    if (password.length < 8) {
      throw ApiError.badRequest("Password must be at least 8 characters")
    }

    const passwordHash = await hashPassword(password)
    const validRoles = ["admin", "designer", "approver"]
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const userRole = (
      validRoles.includes(role ?? "") ? role : "designer"
    ) as UserRole

    let userId: string
    try {
      const inserted = await insertUser({
        email,
        full_name: fullName || email.split("@")[0],
        role: userRole,
        password_hash: passwordHash,
      })
      userId = inserted.id
    } catch (err) {
      // SAFETY: Postgres unique-violation error carries a `code` field; narrowed for the 23505 check.
      if ((err as { code?: string } | null)?.code === "23505") {
        throw new ApiError("A user with this email already exists", 409)
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
        data: {
          user: {
            id: userId,
            email,
            name: fullName || email.split("@")[0],
            role: userRole,
          },
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

    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const cookieOptions = session.cookie.options as Parameters<
      typeof response.cookies.set
    >[2]
    response.cookies.set(
      session.cookie.name,
      session.cookie.value,
      cookieOptions,
    )

    return response
  } catch (error) {
    logProductionRuntimeError("api-auth-register", error)
    return jsonError(error)
  }
}
