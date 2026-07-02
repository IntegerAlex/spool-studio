import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

export async function POST() {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const pool = getPool();
    await pool.query(
      'UPDATE notifications SET read = true WHERE user_id = $1 OR user_id IS NULL',
      [user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logProductionRuntimeError('api-notifications-mark-all-read', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
