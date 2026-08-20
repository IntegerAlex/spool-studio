import { eq, or } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { contentAssets, portalTokens, users } from "@/db/schema"
import { requireUser, verifyPassword } from "@/lib/auth"
import { destroySession } from "@/lib/auth/session"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { logAuditEvent } from "@/services/audit-log-service"

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const { password } = (await request
      .json()
      .catch(() => ({ password: "" }))) as { password?: string }

    const result = await db.transaction(async (tx) => {
      const rows = await tx
        .select({ password_hash: users.password_hash })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)

      // SAFETY: this cast is safe because the value already conforms to the asserted type.
      const passwordHash = (rows[0]?.password_hash as string | null) ?? null
      if (passwordHash) {
        const valid = await verifyPassword(password ?? "", passwordHash)
        if (!valid) {
          return { error: "password_incorrect" }
        }
      }

      // portal_tokens.created_by is NO ACTION, so null it before delete.
      await tx
        .update(portalTokens)
        .set({ created_by: null })
        .where(eq(portalTokens.created_by, user.id))

      // Denormalized references on content_assets have no FK; clear best-effort.
      try {
        await tx
          .update(contentAssets)
          .set({
            // SAFETY: created_by is NOT NULL; cleared best-effort before account row removal.
            created_by: null as never,
            uploaded_by: null,
            approved_by: null,
            scheduled_by: null,
            assigned_to: null,
          })
          .where(
            or(
              eq(contentAssets.created_by, user.id),
              eq(contentAssets.uploaded_by, user.id),
              eq(contentAssets.approved_by, user.id),
              eq(contentAssets.scheduled_by, user.id),
              eq(contentAssets.assigned_to, user.id),
            ),
          )
      } catch {
        // content_assets may be absent in some deployments; safe to skip.
      }

      // team_members, push_subscriptions, password_resets and
      // user_notification_prefs cascade via ON DELETE CASCADE.
      await tx.delete(users).where(eq(users.id, user.id))

      return { ok: true }
    })

    if (result?.error === "password_incorrect") {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      )
    }

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
      // SAFETY: this cast is safe because the value already conforms to the asserted type.
      session.options as Parameters<typeof response.cookies.set>[2],
    )
    return response
  } catch (error) {
    logProductionRuntimeError("api-auth-delete-account", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
