import { NextResponse } from 'next/server';
import { getClientDetail, updateClient, removeClient } from '@/services/clients-service';

interface RouteContext {
  params: { id: string };
}

export async function GET(_request: Request, context: RouteContext) {
  const client = await getClientDetail(context.params.id);
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
  return NextResponse.json({ data: client });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const body = await request.json();
    const client = await updateClient(context.params.id, {
      name: body.name,
      slug: body.slug,
      instagramHandle: body.instagramHandle,
      brandColor: body.brandColor,
      monthlyReelsTarget: body.monthlyReelsTarget,
      monthlyPostsTarget: body.monthlyPostsTarget,
    });
    return NextResponse.json({ data: client });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update client';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await removeClient(context.params.id);
    return NextResponse.json({ data: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete client';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
