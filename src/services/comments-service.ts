import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { AssetComment, CommentType, RevisionStatus } from '@/types/index';
import {
  deleteComment as deleteCommentRow,
  getCommentById,
  insertComment,
  listCommentsByAssetId,
  updateComment as updateCommentRow,
} from '@/repositories/asset-comments-repository';
import { getOrCreateCurrentUserProfile } from '@/services/users-service';
import { getUsersByIds } from '@/services/users-service';
import type { Database } from '@/types/database';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';
import { sendDesignerNotification } from '@/lib/notifications/mailgun';
import { getAssetById } from '@/repositories/assets-repository';
import { getClientById } from '@/repositories/clients-repository';
import { getUserById } from '@/repositories/users-repository';
export interface CommentInput {
  assetId: string;
  type: Database['public']['Enums']['comment_type'];
  message: string;
  revisionStatus?: Database['public']['Enums']['revision_status'] | null;
}

function mapComment(
  comment: Awaited<ReturnType<typeof getCommentById>>
): AssetComment | null {
  if (!comment) {
    return null;
  }

  return {
    id: comment.id,
    assetId: comment.asset_id,
    userId: comment.user_id,
    type: comment.type as CommentType,
    message: comment.message,
    isInternal: comment.type === 'internal_note',
    revisionStatus: comment.revision_status as RevisionStatus | null,
    createdAt: new Date(comment.created_at),
    updatedAt: new Date(comment.updated_at),
  };
}

export async function getCommentsByAssetId(
  assetId: string,
  options?: { limit?: number; offset?: number }
): Promise<AssetComment[]> {
  try {
    const rows = await listCommentsByAssetId(assetId, undefined, options);
    return rows
      .map((row) => mapComment(row))
      .filter((comment): comment is AssetComment => Boolean(comment));
  } catch (error) {
    logProductionRuntimeError('comments-loader', error, { assetId });
    return [];
  }
}

export async function getCommentsWithUsers(
  assetId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ comments: AssetComment[]; users: Awaited<ReturnType<typeof getUsersByIds>> }> {
  const comments = await getCommentsByAssetId(assetId, options);
  const userIds = Array.from(new Set(comments.map((comment) => comment.userId).filter(Boolean)));
  const users = await getUsersByIds(userIds);
  return { comments, users };
}

export async function createComment(input: CommentInput): Promise<AssetComment> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  await getOrCreateCurrentUserProfile();

  if (!input.message.trim()) {
    throw new Error('Message is required');
  }

  const record = await insertComment(
    {
      asset_id: input.assetId,
      user_id: user.id,
      type: input.type,
      message: input.message,
      revision_status: input.revisionStatus ?? null,
    },
    supabase
  );

  const mapped = mapComment(record);
  if (!mapped) {
    throw new Error('Failed to map comment');
  }

  // Handle Notifications
  try {
    const asset = await getAssetById(input.assetId, supabase);
    if (asset?.assigned_to) {
      const assignedDesigner = await getUserById(asset.assigned_to, supabase);
      
      // Do not send if the user adding the comment is the assigned designer themselves
      if (assignedDesigner?.email && user.id !== assignedDesigner.id) {
        let clientName = 'Unknown Client';
        if (asset.client_id) {
          const client = await getClientById(asset.client_id, supabase);
          if (client) {
            clientName = client.name;
          }
        }

        const notificationType = mapped.type === 'revision' ? 'revision_requested' : 'comment_added';

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
          designerName: assignedDesigner.full_name || assignedDesigner.name || null,
          requestedBy: {
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          },
          timestamp: mapped.createdAt,
        });
      }
    }
  } catch (err) {
    console.error('[comments-service] Failed to send designer notification', err);
  }

  return mapped;
}

export async function resolveRevision(commentId: string): Promise<AssetComment> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  const existing = await getCommentById(commentId, supabase);
  if (!existing) {
    throw new Error('Comment not found');
  }

  if (existing.type !== 'revision') {
    throw new Error('Only revision comments can be resolved');
  }

  const record = await updateCommentRow(
    commentId,
    {
      revision_status: 'resolved',
    },
    supabase
  );

  const mapped = mapComment(record);
  if (!mapped) {
    throw new Error('Failed to map comment');
  }

  return mapped;
}

export async function removeComment(commentId: string): Promise<void> {
  await deleteCommentRow(commentId);
}
