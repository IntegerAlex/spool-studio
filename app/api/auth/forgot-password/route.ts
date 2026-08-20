import { NextResponse } from "next/server"
import { signToken } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { getUserByEmail } from "@/repositories/users-repository"
import {
  deletePasswordResetsByUserId,
  insertPasswordReset,
} from "@/repositories/password-resets-repository"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await getUserByEmail(email)

    if (!user) {
      return NextResponse.json({
        message: "If that email exists, a reset link has been sent.",
      })
    }

    const resetToken = await signToken({
      sub: user.id,
      email: user.email,
      role: "designer",
    })

    // Replace any previous reset token for this user.
    await deletePasswordResetsByUserId(user.id)
    await insertPasswordReset({
      user_id: user.id,
      token_hash: resetToken,
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`

    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      try {
        const form = new URLSearchParams()
        form.set("from", process.env.MAILGUN_FROM || "noreply@contentops.com")
        form.set("to", email)
        form.set("subject", "Reset your password")
        form.set(
          "text",
          `Click here to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
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
        console.warn(
          "[auth] failed to send reset email via Mailgun, falling back to console",
          mailErr,
        )
        console.info(`[auth] Reset URL for ${email}: ${resetUrl}`)
      }
    } else {
      console.info(`[auth] Reset URL for ${email}: ${resetUrl}`)
    }

    return NextResponse.json({
      message: "If that email exists, a reset link has been sent.",
    })
  } catch (error) {
    logProductionRuntimeError("api-auth-forgot-password", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
