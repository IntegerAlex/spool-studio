import { NextResponse } from 'next/server';
import { getAssetDetail, updateAsset, removeAsset, setAssetCurrentRevision } from '@/services/assets-service';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';
import { getOrCreateCurrentUserProfile } from '@/services/users-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const assetId = params?.id;
    if (!assetId) {
      return NextResponse.json({ error: 'Asset id is required' }, { status: 400 });
    }
    const asset = await getAssetDetail(assetId);
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    return NextResponse.json({ data: asset });
  } catch (error) {
    logProductionRuntimeError('api-assets-id-get', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const assetId = params?.id;
    if (!assetId) {
      return NextResponse.json({ error: 'Asset id is required' }, { status: 400 });
    }
    const body = await request.json();
    // If the request asks to activate a specific revision, handle that first.
    if (body.currentRevisionId) {
      await setAssetCurrentRevision(assetId, body.currentRevisionId);
    }
    const asset = await updateAsset(assetId, {
      clientId: body.clientId,
      title: body.title,
      type: body.type,
      status: body.status,
      driveFileUrl: body.driveFileUrl,
      thumbnailUrl: body.thumbnailUrl,
      assignedTo: body.assignedTo,
      scheduledAt: body.scheduledAt,
      publishDate: body.publishDate,
      publishTime: body.publishTime,
      scheduledBy: body.scheduledBy,
      publishedAt: body.publishedAt,
      approvedAt: body.approvedAt,
      approvedBy: body.approvedBy,
    });
    return NextResponse.json({ data: asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update asset';
    logProductionRuntimeError('api-assets-id-patch', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await getOrCreateCurrentUserProfile();
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const assetId = params?.id;
    if (!assetId) {
      return NextResponse.json({ error: 'Asset id is required' }, { status: 400 });
    }
    await removeAsset(assetId);
    return NextResponse.json({ data: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete asset';
    logProductionRuntimeError('api-assets-id-delete', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
