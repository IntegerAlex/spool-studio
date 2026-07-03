import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireUser, hashPassword } from '@/lib/auth';
import { signToken } from '@/lib/auth/jwt';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';
import { logAuditEvent } from '@/services/audit-log-service';

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  for (let i = 0; i < 16; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can invite users' }, { status: 403 });
    }

    const { email, role } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const validRoles = ['admin', 'designer', 'approver'];
    const userRole = validRoles.includes(role) ? role : 'designer';

    const pool = getPool();

    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const userId = crypto.randomUUID();
    const randomPassword = generateRandomPassword();
    const passwordHash = await hashPassword(randomPassword);

    await pool.query(
      `INSERT INTO users (id, email, full_name, role, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [userId, email, email.split('@')[0], userRole, passwordHash]
    );

    const resetToken = await signToken({ sub: userId, email, role: userRole });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      try {
        const form = new URLSearchParams();
        form.set('from', process.env.MAILGUN_FROM || 'noreply@contentops.com');
        form.set('to', email);
        form.set('subject', 'You\'ve been invited to Libreonix CMS');
        form.set(
          'text',
          `You've been invited to join Libreonix CMS as a ${userRole}.\n\nPlease set your password using the link below:\n${resetUrl}\n\nThis link expires in 24 hours.`
        );

        await fetch(
          `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: form,
          }
        );
      } catch (mailErr) {
        console.warn('[auth] Failed to send invite email via Mailgun', mailErr);
        console.info(`[auth] Invite URL for ${email}: ${resetUrl}`);
      }
    } else {
      console.info(`[auth] Invite URL for ${email}: ${resetUrl}`);
    }

    try {
      await logAuditEvent({
        action: 'user_invited',
        entityType: 'user',
        entityId: userId,
        entityName: email,
        metadata: { role: userRole, invitedBy: user.email },
      });
    } catch (_error) {
      // Audit logging should not block invite.
    }

    return NextResponse.json(
      { message: 'Invitation sent successfully', userId, email, role: userRole },
      { status: 201 }
    );
  } catch (error) {
    logProductionRuntimeError('api-auth-invite', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
