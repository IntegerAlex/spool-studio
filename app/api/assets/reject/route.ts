import { NextResponse } from 'next/server';

import { rejectAsset } from '@/services/assets-service';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { assetId?: string };
    const assetId = body.assetId?.trim();
    if (!assetId) {
      return NextResponse.json({ error: 'assetId is required' }, { status: 400 });
    }

    const updated = await rejectAsset(assetId, user.id);

    return NextResponse.json({ data: updated });
  } catch (error) {
    logProductionRuntimeError('api-assets-reject', error);
    const message = error instanceof Error ? error.message : 'Rejection failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
