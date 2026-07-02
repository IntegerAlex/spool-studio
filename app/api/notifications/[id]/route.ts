import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const pool = getPool();
    const { rows } = await pool.query(
      'UPDATE notifications SET read = true WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) RETURNING id, user_id, type, title, message, related_asset_id, read, created_at',
      [id, user.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const r = rows[0];
    return NextResponse.json({
      id: r.id, userId: r.user_id, type: r.type, title: r.title,
      message: r.message, relatedAssetId: r.related_asset_id, read: r.read, createdAt: r.created_at,
    });
  } catch (error) {
    logProductionRuntimeError('api-notifications-patch', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const pool = getPool();
    const { rowCount } = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
      [id, user.id]
    );

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logProductionRuntimeError('api-notifications-delete', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
