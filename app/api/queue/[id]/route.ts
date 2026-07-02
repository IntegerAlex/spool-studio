import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const updates = await request.json();

    const pool = getPool();
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    if (updates.status !== undefined) { sets.push(`status = $${idx++}`); vals.push(updates.status); }
    if (updates.scheduledDate !== undefined) { sets.push(`scheduled_date = $${idx++}`); vals.push(updates.scheduledDate); }
    if (updates.caption !== undefined) { sets.push(`caption = $${idx++}`); vals.push(updates.caption); }
    if (updates.hashtags !== undefined) { sets.push(`hashtags = $${idx++}`); vals.push(JSON.stringify(updates.hashtags)); }
    if (updates.platform !== undefined) { sets.push(`platform = $${idx++}`); vals.push(updates.platform); }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE upload_queue SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    const r = rows[0];
    return NextResponse.json({
      id: r.id, assetId: r.asset_id, scheduledDate: r.scheduled_date,
      platform: r.platform, status: r.status, caption: r.caption, hashtags: r.hashtags,
    });
  } catch (error) {
    logProductionRuntimeError('api-queue-patch', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const pool = getPool();
    await pool.query('DELETE FROM upload_queue WHERE status = \'completed\'');
    return NextResponse.json({ success: true });
  } catch (error) {
    logProductionRuntimeError('api-queue-delete', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
