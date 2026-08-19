import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { getPool } from "@/lib/db"
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

    const pool = getPool()
    const { rows } = await pool.query(
      `SELECT email_on_asset_uploaded, email_on_revision_requested,
              email_on_comment_added, email_on_approval_decision, push_enabled
       FROM user_notification_prefs WHERE user_id = $1`,
      [user.id],
    )

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

    const pool = getPool()
    await pool.query(
      `INSERT INTO user_notification_prefs
         (user_id, email_on_asset_uploaded, email_on_revision_requested,
          email_on_comment_added, email_on_approval_decision, push_enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         email_on_asset_uploaded = EXCLUDED.email_on_asset_uploaded,
         email_on_revision_requested = EXCLUDED.email_on_revision_requested,
         email_on_comment_added = EXCLUDED.email_on_comment_added,
         email_on_approval_decision = EXCLUDED.email_on_approval_decision,
         push_enabled = EXCLUDED.push_enabled,
         updated_at = NOW()`,
      [
        user.id,
        prefs.emailOnAssetUploaded,
        prefs.emailOnRevisionRequested,
        prefs.emailOnCommentAdded,
        prefs.emailOnApprovalDecision,
        prefs.pushEnabled,
      ],
    )

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
