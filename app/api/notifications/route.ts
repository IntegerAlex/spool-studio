import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, user_id, type, title, message, related_asset_id, read, created_at FROM notifications WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC LIMIT 50',
      [user.id]
    );

    return NextResponse.json(rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      title: r.title,
      message: r.message,
      relatedAssetId: r.related_asset_id,
      read: r.read,
      createdAt: r.created_at,
    })));
  } catch (error) {
    logProductionRuntimeError('api-notifications-get', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
