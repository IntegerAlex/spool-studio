import { NextResponse } from 'next/server';
import { getAssetSummary } from '@/services/assets-service';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

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

    const asset = await getAssetSummary(assetId);
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({ data: asset });
  } catch (error) {
    logProductionRuntimeError('api-assets-summary-get', error);
    return NextResponse.json({ data: null });
  }
}
