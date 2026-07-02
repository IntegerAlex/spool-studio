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

    if (user.role !== 'admin' && user.role !== 'approver') {
      return NextResponse.json({ error: 'Only admins and approvers can create portal tokens' }, { status: 403 });
    }

    const body = await request.json();
    const clientId = body.clientId?.trim();
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const expiresInDays = body.expiresInDays ?? 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO portal_tokens (client_id, token, expires_at, created_by)
       VALUES ($1, gen_random_uuid()::text, $2, $3)
       RETURNING id, client_id, token, expires_at, created_at`,
      [clientId, expiresAt.toISOString(), user.id]
    );

    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (error) {
    logProductionRuntimeError('api-portal-token-post', error);
    const message = error instanceof Error ? error.message : 'Failed to create portal token';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT pt.id, pt.client_id, pt.token, pt.expires_at, pt.created_at,
              c.name as client_name
       FROM portal_tokens pt
       JOIN clients c ON c.id = pt.client_id
       WHERE pt.expires_at IS NULL OR pt.expires_at > NOW()
       ORDER BY pt.created_at DESC`
    );

    return NextResponse.json({ data: rows });
  } catch (error) {
    logProductionRuntimeError('api-portal-token-get', error);
    return NextResponse.json({ data: [] });
  }
}
