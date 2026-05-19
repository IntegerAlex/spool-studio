import { NextResponse } from 'next/server';
import { createClient, getClients } from '@/services/clients-service';

export async function GET() {
  const clients = await getClients();
  return NextResponse.json({ data: clients });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.name || !body?.slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }
    const client = await createClient({
      name: body.name,
      slug: body.slug,
      instagramHandle: body.instagramHandle,
      brandColor: body.brandColor,
      monthlyReelsTarget: body.monthlyReelsTarget,
      monthlyPostsTarget: body.monthlyPostsTarget,
    });
    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create client';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
