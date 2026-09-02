import { getCurrentUser } from "@/lib/auth"
import { emitEvent } from "@/lib/event-bus"
import { sendDesignerNotification } from "@/lib/notifications/mailgun"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  deleteComment as deleteCommentRow,
  getCommentById,
  insertComment,
  listCommentsByAssetId,
  updateComment as updateCommentRow,
} from "@/repositories/asset-comments-repository"
import { getAssetById } from "@/repositories/assets-repository"
import { getClientById } from "@/repositories/clients-repository"
import { createNotification } from "@/repositories/notifications-repository"
import {
  findUserByNormalizedName,
  getUserById,
} from "@/repositories/users-repository"
import { logAuditEvent } from "@/services/audit-log-service"
import {
  getOrCreateCurrentUserProfile,
  getUsersByIds,
} from "@/services/users-service"
import type { CommentType, RevisionStatus } from "@/types"
import type { AssetComment } from "@/types/index"

export interface CommentInput {
  assetId: string
  type: CommentType
  message: string
  revisionStatus?: RevisionStatus | null
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
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    type: comment.type as CommentType,
    message: comment.message,
    isInternal: comment.type === "internal_note",
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    revisionStatus: comment.revision_status as RevisionStatus | null,
    createdAt: new Date(comment.created_at),
    updatedAt: new Date(comment.updated_at),
  }
}

function parseMentionedUsernames(message: string): string[] {
  const mentionRegex = /@(\w+)/g
  const usernames: string[] = []
  let match: RegExpExecArray | null = mentionRegex.exec(message)
  while (match !== null) {
    usernames.push(match[1].toLowerCase())
    match = mentionRegex.exec(message)
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

  for (const username of mentionedUsernames) {
    try {
      const targetUser = await findUserByNormalizedName(username, commenterId)

      if (targetUser) {
        await createNotification({
          userId: targetUser.id,
          type: "comment",
          title: "You were mentioned",
          message: `You were mentioned in a comment on an asset: "${commentMessage.slice(0, 100)}${commentMessage.length > 100 ? "..." : ""}"`,
          relatedAssetId: assetId,
        })
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
    const rows = await listCommentsByAssetId(assetId, options)
    return rows
      .map((row) => mapComment(row))
      .filter((comment): comment is AssetComment => Boolean(comment))
  } catch (error) {
    logProductionRuntimeError("comments-loader", error, { assetId })
    throw error
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

  await getOrCreateCurrentUserProfile()

  if (!input.message.trim()) {
    throw new Error("Message is required")
  }

  const record = await insertComment({
    asset_id: input.assetId,
    user_id: user.id,
    type: input.type,
    message: input.message,
    revision_status: input.revisionStatus ?? null,
  })

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
  } catch {
    // Audit logging should not block comment creation.
  }

  // Handle Notifications
  try {
    const asset = await getAssetById(input.assetId)
    if (asset?.assigned_to) {
      const assignedDesigner = await getUserById(asset.assigned_to)

      // Do not send if the user adding the comment is the assigned designer themselves
      if (assignedDesigner?.email && user.id !== assignedDesigner.id) {
        let clientName = "Unknown Client"
        if (asset.client_id) {
          const client = await getClientById(asset.client_id)
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

  const existing = await getCommentById(commentId)
  if (!existing) {
    throw new Error("Comment not found")
  }

  if (existing.type !== "revision") {
    throw new Error("Only revision comments can be resolved")
  }

  const record = await updateCommentRow(commentId, {
    revision_status: "resolved",
  })

  const mapped = mapComment(record)
  if (!mapped) {
    throw new Error("Failed to map comment")
  }

  return mapped
}

export async function removeComment(commentId: string): Promise<void> {
  await deleteCommentRow(commentId)
}
