import { NextResponse } from "next/server"
import { requireUser, verifyPassword } from "@/lib/auth"
import { destroySession } from "@/lib/auth/session"
import { getPool } from "@/lib/db"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { logAuditEvent } from "@/services/audit-log-service"

export async function POST(request: Request) {
  let client: Awaited<
    ReturnType<ReturnType<typeof getPool>["connect"]>
  > | null = null

  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { password } = (await request
      .json()
      .catch(() => ({ password: "" }))) as { password?: string }

    const pool = getPool()
    client = await pool.connect()

    await client.query("BEGIN")

    const { rows } = await client.query(
      "SELECT password_hash FROM users WHERE id = $1 FOR UPDATE",
      [user.id],
    )

    const passwordHash = (rows[0]?.password_hash as string | null) ?? null
    if (passwordHash) {
      const valid = await verifyPassword(password ?? "", passwordHash)
      if (!valid) {
        await client.query("ROLLBACK")
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 401 },
        )
      }
    }

    // portal_tokens.created_by is NO ACTION, so null it before delete.
    await client.query(
      "UPDATE portal_tokens SET created_by = NULL WHERE created_by = $1",
      [user.id],
    )

    // Denormalized references on content_assets have no FK; clear best-effort.
    try {
      await client.query(
        `UPDATE content_assets
         SET created_by = NULL, uploaded_by = NULL, approved_by = NULL,
             scheduled_by = NULL, assigned_to = NULL
         WHERE created_by = $1 OR uploaded_by = $1 OR approved_by = $1
            OR scheduled_by = $1 OR assigned_to = $1`,
        [user.id],
      )
    } catch {
      // content_assets may be absent in some deployments; safe to skip.
    }

    // team_members, push_subscriptions, password_resets and
    // user_notification_prefs cascade via ON DELETE CASCADE.
    await client.query("DELETE FROM users WHERE id = $1", [user.id])

    await client.query("COMMIT")

    try {
      await logAuditEvent({
        action: "account_deleted",
        entityType: "user",
        entityId: user.id,
        entityName: user.email ?? user.name ?? "",
      })
    } catch {
      // Audit logging must not block the deletion.
    }

    const response = NextResponse.json({ success: true })
    const session = destroySession()
    response.cookies.set(
      session.name,
      session.value,
      session.options as Parameters<typeof response.cookies.set>[2],
    )
    return response
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK")
      } catch {
        // Ignore rollback failure.
      }
    }
    logProductionRuntimeError("api-auth-delete-account", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  } finally {
    if (client) client.release()
  }
}
