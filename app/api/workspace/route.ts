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
      'SELECT id, name, logo, created_at FROM workspaces LIMIT 1'
    );

    if (rows.length === 0) {
      return NextResponse.json({ id: null, name: 'My Workspace', logo: null, members: [], createdAt: new Date() });
    }

    const ws = rows[0];
    const { rows: members } = await pool.query(
      'SELECT tm.id, tm.user_id, tm.workspace_id, tm.role, tm.joined_at FROM team_members tm WHERE tm.workspace_id = $1',
      [ws.id]
    );

    return NextResponse.json({
      id: ws.id,
      name: ws.name,
      logo: ws.logo,
      members: members.map((m) => ({
        id: m.id, userId: m.user_id, workspaceId: m.workspace_id, role: m.role, joinedAt: m.joined_at,
      })),
      createdAt: ws.created_at,
    });
  } catch (error) {
    logProductionRuntimeError('api-workspace-get', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, logo } = await request.json();
    const pool = getPool();

    const { rows } = await pool.query('SELECT id FROM workspaces LIMIT 1');
    let wsId: string;

    if (rows.length === 0) {
      wsId = crypto.randomUUID();
      await pool.query(
        'INSERT INTO workspaces (id, name, logo, created_at) VALUES ($1, $2, $3, NOW())',
        [wsId, name || 'My Workspace', logo || null]
      );
    } else {
      wsId = rows[0].id;
      const sets: string[] = [];
      const vals: any[] = [];
      let idx = 1;
      if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name); }
      if (logo !== undefined) { sets.push(`logo = $${idx++}`); vals.push(logo); }
      if (sets.length > 0) {
        vals.push(wsId);
        await pool.query(`UPDATE workspaces SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
      }
    }

    return NextResponse.json({ id: wsId, name: name || 'My Workspace', logo: logo || null });
  } catch (error) {
    logProductionRuntimeError('api-workspace-update', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
