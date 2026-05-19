import { NextResponse } from 'next/server';
import { createAsset, getAssets, getAssetsByClientId } from '@/services/assets-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');

  const assets = clientId ? await getAssetsByClientId(clientId) : await getAssets();
  return NextResponse.json({ data: assets });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.clientId || !body?.title || !body?.type) {
      return NextResponse.json({ error: 'Client, title, and type are required' }, { status: 400 });
    }
    const asset = await createAsset({
      clientId: body.clientId,
      title: body.title,
      type: body.type,
      status: body.status,
      driveFileUrl: body.driveFileUrl,
      thumbnailUrl: body.thumbnailUrl,
      assignedTo: body.assignedTo ?? null,
      scheduledAt: body.scheduledAt ?? null,
    });
    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create asset';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
