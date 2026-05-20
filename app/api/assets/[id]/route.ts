import { NextResponse } from 'next/server';
import { getAssetDetail, updateAsset, removeAsset } from '@/services/assets-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
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
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const assetId = params?.id;
    if (!assetId) {
      return NextResponse.json({ error: 'Asset id is required' }, { status: 400 });
    }
    const body = await request.json();
    const asset = await updateAsset(assetId, {
      clientId: body.clientId,
      title: body.title,
      type: body.type,
      status: body.status,
      driveFileUrl: body.driveFileUrl,
      thumbnailUrl: body.thumbnailUrl,
      assignedTo: body.assignedTo,
      scheduledAt: body.scheduledAt,
    });
    return NextResponse.json({ data: asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update asset';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const assetId = params?.id;
    if (!assetId) {
      return NextResponse.json({ error: 'Asset id is required' }, { status: 400 });
    }
    await removeAsset(assetId);
    return NextResponse.json({ data: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete asset';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
