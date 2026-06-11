import { NextResponse } from 'next/server';
import { createClient, getClients } from '@/services/clients-service';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

export async function GET() {
  try {
    const clients = await getClients();
    return NextResponse.json({ data: clients });
  } catch (error) {
    logProductionRuntimeError('api-clients-get', error);
    return NextResponse.json({ data: [] });
  }
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
      monthlyGoal: body.monthlyGoal,
      weeklyGoal: body.weeklyGoal,
      weeklyPosterGoal: body.weeklyPosterGoal,
      weeklyReelGoal: body.weeklyReelGoal,
      contractStartDate: body.contractStartDate,
      contractEndDate: body.contractEndDate,
    });
    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create client';
    logProductionRuntimeError('api-clients-post', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
