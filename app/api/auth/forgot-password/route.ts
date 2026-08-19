import { NextResponse } from "next/server"
import { signToken } from "@/lib/auth"
import { getPool } from "@/lib/db"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const pool = getPool()
    const { rows } = await pool.query(
      "SELECT id, email FROM users WHERE email = $1",
      [email],
    )

    if (rows.length === 0) {
      return NextResponse.json({
        message: "If that email exists, a reset link has been sent.",
      })
    }

    const user = rows[0]
    const resetToken = await signToken({
      sub: user.id,
      email: user.email,
      role: "designer",
    })

    const { rows: existing } = await pool.query(
      "SELECT id FROM password_reset_tokens WHERE user_id = $1",
      [user.id],
    )

    if (existing.length > 0) {
      await pool.query(
        "UPDATE password_reset_tokens SET token = $1, expires_at = NOW() + INTERVAL '1 hour', used = false WHERE user_id = $2",
        [resetToken, user.id],
      )
    } else {
      await pool.query(
        "INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')",
        [crypto.randomUUID(), user.id, resetToken],
      )
    }

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
