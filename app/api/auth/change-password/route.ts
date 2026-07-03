import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireUser, verifyPassword, hashPassword } from '@/lib/auth';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';
import { logAuditEvent } from '@/services/audit-log-service';

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [user.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const passwordHash = rows[0].password_hash as string | null;
    if (!passwordHash) {
      return NextResponse.json(
        { error: 'No password set for this account' },
        { status: 400 }
      );
    }

    const valid = await verifyPassword(currentPassword, passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    const newHash = await hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);

    try {
      await logAuditEvent({
        action: 'password_changed',
        entityType: 'user',
        entityId: user.id,
        entityName: user.email ?? user.name ?? '',
      });
    } catch (_error) {
      // Audit logging should not block password change.
    }

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error) {
    logProductionRuntimeError('api-auth-change-password', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
