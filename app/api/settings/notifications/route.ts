import { NextResponse } from "next/server"
import { jsonError, readJsonBody } from "@/lib/api-error"
import {
  requireUser,
} from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  getUserNotificationPrefs,
  upsertUserNotificationPrefs,
} from "@/repositories/user-notification-prefs-repository"

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

    const prefs = await getUserNotificationPrefs(user.id)
    if (!prefs) {
      return NextResponse.json({ data: DEFAULT_PREFS })
    }

    return NextResponse.json({
      data: {
        emailOnAssetUploaded: prefs.email_on_asset_uploaded,
        emailOnRevisionRequested: prefs.email_on_revision_requested,
        emailOnCommentAdded: prefs.email_on_comment_added,
        emailOnApprovalDecision: prefs.email_on_approval_decision,
        pushEnabled: prefs.push_enabled,
      },
    })
  } catch (error) {
    logProductionRuntimeError("api-settings-notifications-get", error)
    return jsonError(error)
  }
}

export async function PUT(request: Request) {
  try {
    // Per-user preferences: any authenticated user updates their OWN prefs
    // (repo scopes by user id). settings:update would lock this to admins.
    const user = await requireUser()

    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const body = (await readJsonBody(request)) as {
      emailOnAssetUploaded?: boolean
      emailOnRevisionRequested?: boolean
      emailOnCommentAdded?: boolean
      emailOnApprovalDecision?: boolean
      pushEnabled?: boolean
    }
    const prefs: NotificationPrefs = {
      emailOnAssetUploaded: Boolean(body.emailOnAssetUploaded),
      emailOnRevisionRequested: Boolean(body.emailOnRevisionRequested),
      emailOnCommentAdded: Boolean(body.emailOnCommentAdded),
      emailOnApprovalDecision: Boolean(body.emailOnApprovalDecision),
      pushEnabled: Boolean(body.pushEnabled),
    }

    await upsertUserNotificationPrefs({
      user_id: user.id,
      email_on_asset_uploaded: prefs.emailOnAssetUploaded,
      email_on_revision_requested: prefs.emailOnRevisionRequested,
      email_on_comment_added: prefs.emailOnCommentAdded,
      email_on_approval_decision: prefs.emailOnApprovalDecision,
      push_enabled: prefs.pushEnabled,
    })

    return NextResponse.json({
      data: {
        message: "Notification preferences updated",
        prefs,
      },
    })
  } catch (error) {
    logProductionRuntimeError("api-settings-notifications-put", error)
    return jsonError(error)
  }
}
