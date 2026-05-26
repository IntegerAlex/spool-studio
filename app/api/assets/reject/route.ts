import { NextResponse } from 'next/server';

import { rejectAsset } from '@/services/assets-service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
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
