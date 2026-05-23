import { NextResponse } from 'next/server';
import { createAsset, getAssets, getAssetsByClientId } from '@/services/assets-service';
import { assetStatusValues } from '@/lib/asset-workflow';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');

  const assets = clientId ? await getAssetsByClientId(clientId) : await getAssets();
  return NextResponse.json({ data: assets });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.info('[api/assets] create payload', body);
    if (!body?.clientId || !body?.title || !body?.type) {
      const error = 'Client, title, and type are required';
      console.warn('[api/assets] validation error', { error, body });
      return NextResponse.json({ success: false, error }, { status: 400 });
    }
    const allowedTypes = ['reel', 'poster'];
    const allowedStatuses = [...assetStatusValues];
    if (!allowedTypes.includes(body.type)) {
      const error = `Invalid asset type: ${body.type}`;
      console.warn('[api/assets] enum mismatch', { error, type: body.type });
      return NextResponse.json({ success: false, error }, { status: 400 });
    }
    if (body.status && !allowedStatuses.includes(body.status)) {
      const error = `Invalid status: ${body.status}`;
      console.warn('[api/assets] enum mismatch', { error, status: body.status });
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const payload = {
      clientId: body.clientId,
      title: body.title,
      type: body.type,
      status: body.status,
      driveFileUrl: body.driveFileUrl,
      thumbnailUrl: body.thumbnailUrl,
      assignedTo: body.assignedTo ?? null,
      scheduledAt: body.scheduledAt ?? null,
    };
    console.info('[api/assets] parsed payload', payload);
    const asset = await createAsset({
      clientId: payload.clientId,
      title: payload.title,
      type: payload.type,
      status: payload.status,
      driveFileUrl: payload.driveFileUrl,
      thumbnailUrl: payload.thumbnailUrl,
      assignedTo: payload.assignedTo,
      scheduledAt: payload.scheduledAt,
    });
    console.info('[api/assets] insert result', asset);
    return NextResponse.json({ success: true, data: asset }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create asset';
    console.error('[api/assets] create error', { error });
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
