import { getCurrentUser } from "@/lib/auth"
import { getPool } from "@/lib/db"
import { emitEvent } from "@/lib/event-bus"
import { sendDesignerNotification } from "@/lib/notifications/mailgun"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  deleteComment as deleteCommentRow,
  getCommentById,
  insertComment,
  listCommentsByAssetId,
  updateComment as updateCommentRow,
} from "@/repositories/asset-comments-repository"
import { getAssetById } from "@/repositories/assets-repository"
import { getClientById } from "@/repositories/clients-repository"
import { getUserById } from "@/repositories/users-repository"
import { logAuditEvent } from "@/services/audit-log-service"
import {
  getOrCreateCurrentUserProfile,
  getUsersByIds,
} from "@/services/users-service"
import type { Database } from "@/types/database"
import type { AssetComment, CommentType, RevisionStatus } from "@/types/index"

export interface CommentInput {
  assetId: string
  type: Database["public"]["Enums"]["comment_type"]
  message: string
  revisionStatus?: Database["public"]["Enums"]["revision_status"] | null
}

function mapComment(
  comment: Awaited<ReturnType<typeof getCommentById>>,
): AssetComment | null {
  if (!comment) {
    return null
  }

  return {
    id: comment.id,
    assetId: comment.asset_id,
    userId: comment.user_id,
    type: comment.type as CommentType,
    message: comment.message,
    isInternal: comment.type === "internal_note",
    revisionStatus: comment.revision_status as RevisionStatus | null,
    createdAt: new Date(comment.created_at),
    updatedAt: new Date(comment.updated_at),
  }
}

function parseMentionedUsernames(message: string): string[] {
  const mentionRegex = /@(\w+)/g
  const usernames: string[] = []
  let match
  while ((match = mentionRegex.exec(message)) !== null) {
    usernames.push(match[1].toLowerCase())
  }
  return [...new Set(usernames)]
}

async function createMentionNotifications(
  mentionedUsernames: string[],
  commenterId: string,
  assetId: string,
  commentMessage: string,
): Promise<void> {
  if (mentionedUsernames.length === 0) return

  const pool = getPool()

  for (const username of mentionedUsernames) {
    try {
      const { rows: users } = await pool.query(
        `SELECT id, full_name FROM users WHERE LOWER(REPLACE(full_name, ' ', '')) = $1 AND id != $2`,
        [username, commenterId],
      )

      if (users.length > 0) {
        const targetUser = users[0]
        await pool.query(
          `INSERT INTO notifications (id, user_id, type, title, message, related_asset_id, created_at)
           VALUES (gen_random_uuid()::text, $1, 'comment', 'You were mentioned', $2, $3, NOW())`,
          [
            targetUser.id,
            `You were mentioned in a comment on an asset: "${commentMessage.slice(0, 100)}${commentMessage.length > 100 ? "..." : ""}"`,
            assetId,
          ],
        )
      }
    } catch (err) {
      console.error(
        "[comments-service] Failed to create mention notification",
        { username, error: err },
      )
    }
  }
}

export async function getCommentsByAssetId(
  assetId: string,
  options?: { limit?: number; offset?: number },
): Promise<AssetComment[]> {
  try {
    const rows = await listCommentsByAssetId(assetId, undefined, options)
    return rows
      .map((row) => mapComment(row))
      .filter((comment): comment is AssetComment => Boolean(comment))
  } catch (error) {
    logProductionRuntimeError("comments-loader", error, { assetId })
    return []
  }
}

export async function getCommentsWithUsers(
  assetId: string,
  options?: { limit?: number; offset?: number },
): Promise<{
  comments: AssetComment[]
  users: Awaited<ReturnType<typeof getUsersByIds>>
}> {
  const comments = await getCommentsByAssetId(assetId, options)
  const userIds = Array.from(
    new Set(comments.map((comment) => comment.userId).filter(Boolean)),
  )
  const users = await getUsersByIds(userIds)
  return { comments, users }
}

export async function createComment(
  input: CommentInput,
): Promise<AssetComment> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }

  const supabase = await createServerSupabaseClient()

  await getOrCreateCurrentUserProfile()

  if (!input.message.trim()) {
    throw new Error("Message is required")
  }

  const record = await insertComment(
    {
      asset_id: input.assetId,
      user_id: user.id,
      type: input.type,
      message: input.message,
      revision_status: input.revisionStatus ?? null,
    },
    supabase,
  )

  const mapped = mapComment(record)
  if (!mapped) {
    throw new Error("Failed to map comment")
  }

  emitEvent({
    type: "comment:created",
    payload: {
      commentId: mapped.id,
      assetId: mapped.assetId,
      userId: mapped.userId,
      type: mapped.type,
      message: mapped.message,
    },
  })

  try {
    await logAuditEvent({
      action: "comment_created",
      entityType: "asset",
      entityId: mapped.assetId,
      entityName: "",
      metadata: {
        commentId: mapped.id,
        type: mapped.type,
        message: mapped.message.substring(0, 200),
      },
    })
  } catch (_error) {
    // Audit logging should not block comment creation.
  }

  // Handle Notifications
  try {
    const asset = await getAssetById(input.assetId, supabase)
    if (asset?.assigned_to) {
      const assignedDesigner = await getUserById(asset.assigned_to, supabase)

      // Do not send if the user adding the comment is the assigned designer themselves
      if (assignedDesigner?.email && user.id !== assignedDesigner.id) {
        let clientName = "Unknown Client"
        if (asset.client_id) {
          const client = await getClientById(asset.client_id, supabase)
          if (client) {
            clientName = client.name
          }
        }

        const notificationType =
          mapped.type === "revision" ? "revision_requested" : "comment_added"

        void sendDesignerNotification({
          notificationType,
          assetId: mapped.assetId,
          assetTitle: asset.title,
          assetType: asset.type,
          clientId: asset.client_id,
          clientName,
          commentMessage: mapped.message,
          designerId: assignedDesigner.id,
          designerEmail: assignedDesigner.email,
          designerName: assignedDesigner.full_name || null,
          requestedBy: {
            email: user.email,
            name: user.name || null,
          },
          timestamp: mapped.createdAt,
        })
      }
    }
  } catch (err) {
    console.error(
      "[comments-service] Failed to send designer notification",
      err,
    )
  }

  // Handle @mention notifications
  try {
    const mentionedUsernames = parseMentionedUsernames(input.message)
    if (mentionedUsernames.length > 0) {
      await createMentionNotifications(
        mentionedUsernames,
        user.id,
        input.assetId,
        input.message,
      )
    }
  } catch (err) {
    console.error(
      "[comments-service] Failed to create mention notifications",
      err,
    )
  }

  return mapped
}

export async function resolveRevision(
  commentId: string,
): Promise<AssetComment> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }

  const supabase = await createServerSupabaseClient()

  const existing = await getCommentById(commentId, supabase)
  if (!existing) {
    throw new Error("Comment not found")
  }

  if (existing.type !== "revision") {
    throw new Error("Only revision comments can be resolved")
  }

  const record = await updateCommentRow(
    commentId,
    {
      revision_status: "resolved",
    },
    supabase,
  )

  const mapped = mapComment(record)
  if (!mapped) {
    throw new Error("Failed to map comment")
  }

  return mapped
}

export async function removeComment(commentId: string): Promise<void> {
  await deleteCommentRow(commentId)
}
