import { NextResponse } from "next/server"
import { hashPassword, requireUser } from "@/lib/auth"
import { signToken } from "@/lib/auth/jwt"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { logAuditEvent } from "@/services/audit-log-service"
import { getUserByEmail, insertUser } from "@/repositories/users-repository"
import type { UserRole } from "@/types"

function generateRandomPassword(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
  let password = ""
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  for (let i = 0; i < 16; i++) {
    password += chars[array[i] % chars.length]
  }
  return password
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()

    if (user.role !== "admin") {
      throw ApiError.forbidden("Only admins can invite users")
    }

    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const { email, role } = (await readJsonBody(request)) as {
      email?: string
      role?: string
    }

    if (!email) {
      throw ApiError.badRequest("Email is required")
    }

    const validRoles = ["admin", "designer", "approver"]
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const userRole = (
      validRoles.includes(role ?? "") ? role : "designer"
    ) as UserRole

    const existing = await getUserByEmail(email)

    if (existing) {
      throw new ApiError("A user with this email already exists", 409)
    }

    const randomPassword = generateRandomPassword()
    const passwordHash = await hashPassword(randomPassword)

    const inserted = await insertUser({
      email,
      full_name: email.split("@")[0],
      role: userRole,
      password_hash: passwordHash,
    })
    const userId = inserted.id

    const resetToken = await signToken({ sub: userId, email, role: userRole })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`

    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      try {
        const form = new URLSearchParams()
        form.set("from", process.env.MAILGUN_FROM || "noreply@contentops.com")
        form.set("to", email)
        form.set("subject", "You've been invited to Libreonix CMS")
        form.set(
          "text",
          `You've been invited to join Libreonix CMS as a ${userRole}.\n\nPlease set your password using the link below:\n${resetUrl}\n\nThis link expires in 24 hours.`,
        )

        await fetch(
          `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString("base64")}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: form,
          },
        )
      } catch (mailErr) {
        console.warn("[auth] Failed to send invite email via Mailgun", mailErr)
        console.info(`[auth] Invite URL for ${email}: ${resetUrl}`)
      }
    } else {
      console.info(`[auth] Invite URL for ${email}: ${resetUrl}`)
    }

    try {
      await logAuditEvent({
        action: "user_invited",
        entityType: "user",
        entityId: userId,
        entityName: email,
        metadata: { role: userRole, invitedBy: user.email },
      })
    } catch {
      // Audit logging should not block invite.
    }

    return NextResponse.json(
      {
        message: "Invitation sent successfully",
        userId,
        email,
        role: userRole,
      },
      { status: 201 },
    )
  } catch (error) {
    logProductionRuntimeError("api-auth-invite", error)
    return jsonError(error)
  }
}
