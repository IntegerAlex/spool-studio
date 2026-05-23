import { NextResponse } from 'next/server';
import { createComment, getCommentsByAssetId } from '@/services/comments-service';
import { logAssetActivity } from '@/services/activity-service';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const allowedTypes = ['comment', 'revision', 'approval_note', 'internal_note'];

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const assetId = params?.id;
    if (!assetId) {
      return NextResponse.json({ error: 'Asset id is required' }, { status: 400 });
    }

    const comments = await getCommentsByAssetId(assetId);
    return NextResponse.json({ data: comments });
  } catch (error) {
    logProductionRuntimeError('api-assets-comments-get', error);
    return NextResponse.json({ data: [] });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const assetId = params?.id;
    if (!assetId) {
      return NextResponse.json({ error: 'Asset id is required' }, { status: 400 });
    }

    const body = await request.json();
    if (!body?.message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (body.type && !allowedTypes.includes(body.type)) {
      return NextResponse.json({ error: 'Invalid comment type' }, { status: 400 });
    }

    const comment = await createComment({
      assetId,
      type: body.type ?? 'comment',
      message: body.message,
      revisionStatus: body.type === 'revision' ? 'open' : null,
    });

    try {
      const action =
        comment.type === 'revision'
          ? 'revision_requested'
          : comment.type === 'approval_note'
          ? 'approval_note_added'
          : comment.type === 'internal_note'
          ? 'internal_note_added'
          : 'comment_added';

      await logAssetActivity({
        assetId,
        action,
        metadata: {
          commentId: comment.id,
          type: comment.type,
        },
      });
    } catch (_error) {
      // Activity logging should not block comment creation.
    }

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create comment';
    logProductionRuntimeError('api-assets-comments-post', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
