import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { userNotificationPrefs } from "@/db/schema"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

export interface NotificationPrefs {
  emailOnAssetUploaded: boolean
  emailOnRevisionRequested: boolean
  emailOnCommentAdded: boolean
  emailOnApprovalDecision: boolean
  pushEnabled: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  emailOnAssetUploaded: true,
  emailOnRevisionRequested: true,
  emailOnCommentAdded: true,
  emailOnApprovalDecision: true,
  pushEnabled: true,
}

export async function GET() {
  try {
    const user = await requireUser()
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const rows = await db
      .select({
        email_on_asset_uploaded: userNotificationPrefs.email_on_asset_uploaded,
        email_on_revision_requested:
          userNotificationPrefs.email_on_revision_requested,
        email_on_comment_added: userNotificationPrefs.email_on_comment_added,
        email_on_approval_decision:
          userNotificationPrefs.email_on_approval_decision,
        push_enabled: userNotificationPrefs.push_enabled,
      })
      .from(userNotificationPrefs)
      .where(eq(userNotificationPrefs.user_id, user.id))
      .limit(1)

    if (rows.length === 0) {
      return NextResponse.json(DEFAULT_PREFS)
    }

    const row = rows[0]
    return NextResponse.json({
      emailOnAssetUploaded: row.email_on_asset_uploaded,
      emailOnRevisionRequested: row.email_on_revision_requested,
      emailOnCommentAdded: row.email_on_comment_added,
      emailOnApprovalDecision: row.email_on_approval_decision,
      pushEnabled: row.push_enabled,
    })
  } catch (error) {
    logProductionRuntimeError("api-settings-notifications-get", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser()
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const prefs: NotificationPrefs = {
      emailOnAssetUploaded: Boolean(body.emailOnAssetUploaded),
      emailOnRevisionRequested: Boolean(body.emailOnRevisionRequested),
      emailOnCommentAdded: Boolean(body.emailOnCommentAdded),
      emailOnApprovalDecision: Boolean(body.emailOnApprovalDecision),
      pushEnabled: Boolean(body.pushEnabled),
    }

    await db
      .insert(userNotificationPrefs)
      .values({
        user_id: user.id,
        email_on_asset_uploaded: prefs.emailOnAssetUploaded,
        email_on_revision_requested: prefs.emailOnRevisionRequested,
        email_on_comment_added: prefs.emailOnCommentAdded,
        email_on_approval_decision: prefs.emailOnApprovalDecision,
        push_enabled: prefs.pushEnabled,
      })
      .onConflictDoUpdate({
        target: userNotificationPrefs.user_id,
        set: {
          email_on_asset_uploaded: prefs.emailOnAssetUploaded,
          email_on_revision_requested: prefs.emailOnRevisionRequested,
          email_on_comment_added: prefs.emailOnCommentAdded,
          email_on_approval_decision: prefs.emailOnApprovalDecision,
          push_enabled: prefs.pushEnabled,
          updated_at: new Date(),
        },
      })

    return NextResponse.json({
      message: "Notification preferences updated",
      prefs,
    })
  } catch (error) {
    logProductionRuntimeError("api-settings-notifications-put", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
