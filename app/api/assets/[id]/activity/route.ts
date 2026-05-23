import { NextResponse } from 'next/server';
import { getAssetActivity } from '@/services/activity-service';
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

    const activity = await getAssetActivity(assetId);
    return NextResponse.json({ data: activity });
  } catch (error) {
    logProductionRuntimeError('api-assets-activity-get', error);
    return NextResponse.json({ data: [] });
  }
}
