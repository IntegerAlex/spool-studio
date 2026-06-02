import { NextResponse } from 'next/server';
import { getClientDetail, updateClient, removeClient } from '@/services/clients-service';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';
import { getOrCreateCurrentUserProfile } from '@/services/users-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    console.info('[api/clients/[id]] params', params);
    const clientId = params?.id;
    if (!clientId) {
      return NextResponse.json({ error: 'Client id is required' }, { status: 400 });
    }
    const client = await getClientDetail(clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    return NextResponse.json({ data: client });
  } catch (error) {
    logProductionRuntimeError('api-clients-id-get', error);
    return NextResponse.json({ data: null });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    console.info('[api/clients/[id]] params', params);
    const clientId = params?.id;
    if (!clientId) {
      return NextResponse.json({ error: 'Client id is required' }, { status: 400 });
    }
    const body = await request.json();
    const client = await updateClient(clientId, {
      name: body.name,
      slug: body.slug,
      instagramHandle: body.instagramHandle,
      brandColor: body.brandColor,
      monthlyReelsTarget: body.monthlyReelsTarget,
      monthlyPostsTarget: body.monthlyPostsTarget,
      monthlyGoal: body.monthlyGoal,
      weeklyGoal: body.weeklyGoal,
      weeklyPosterGoal: body.weeklyPosterGoal,
      weeklyReelGoal: body.weeklyReelGoal,
    });
    return NextResponse.json({ data: client });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update client';
    logProductionRuntimeError('api-clients-id-patch', error);
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
    console.info('[api/clients/[id]] params', params);
    const clientId = params?.id;
    if (!clientId) {
      return NextResponse.json({ error: 'Client id is required' }, { status: 400 });
    }
    await removeClient(clientId);
    return NextResponse.json({ data: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete client';
    logProductionRuntimeError('api-clients-id-delete', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
