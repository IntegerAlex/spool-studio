import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint is required' }, { status: 400 });
    }

    const pool = getPool();
    await pool.query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [user.id, endpoint]
    );

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    logProductionRuntimeError('api-push-unsubscribe', error);
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }
}
