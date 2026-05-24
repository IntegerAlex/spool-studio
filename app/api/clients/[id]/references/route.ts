import { NextResponse } from 'next/server';
import { createClientReference, getClientReferences } from '@/services/client-references-service';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const allowedTypes = [
  'instagram',
  'website',
  'youtube',
  'pinterest',
  'drive_folder',
  'competitor',
  'branding',
  'reel_reference',
  'ad_reference',
  'other',
];

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const clientId = params?.id;
    if (!clientId) {
      return NextResponse.json({ error: 'Client id is required' }, { status: 400 });
    }

    const references = await getClientReferences(clientId);
    return NextResponse.json({ data: references });
  } catch (error) {
    logProductionRuntimeError('api-clients-references-get', error);
    return NextResponse.json({ data: [] });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const clientId = params?.id;
    if (!clientId) {
      return NextResponse.json({ error: 'Client id is required' }, { status: 400 });
    }

    const body = await request.json();
    if (!body?.title || !body?.url) {
      return NextResponse.json({ error: 'Title and URL are required' }, { status: 400 });
    }

    if (body.type && !allowedTypes.includes(body.type)) {
      return NextResponse.json({ error: 'Invalid reference type' }, { status: 400 });
    }

    const reference = await createClientReference({
      clientId,
      title: body.title,
      url: body.url,
      description: body.description,
      type: body.type,
    });

    return NextResponse.json({ data: reference }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create reference';
    logProductionRuntimeError('api-clients-references-post', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}