import { NextResponse } from 'next/server';
import { getAssetActivity, getAssetActivityWithUsers } from '@/services/activity-service';
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

    const { searchParams } = new URL(_request.url);
    const includeUsers = searchParams.get('includeUsers') === '1';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : undefined;

    if (includeUsers) {
      const payload = await getAssetActivityWithUsers(assetId, { limit });
      return NextResponse.json({ data: payload });
    }

    const activity = await getAssetActivity(assetId, { limit });
    return NextResponse.json({ data: activity });
  } catch (error) {
    logProductionRuntimeError('api-assets-activity-get', error);
    return NextResponse.json({ data: [] });
  }
}
