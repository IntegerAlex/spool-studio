import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';
import { logAuditEvent } from '@/services/audit-log-service';
import type { UserRole } from '@/types/index';

// The password_hash column must be added to the users table:
//   ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
//
// It is intentionally left out of the generated DB types to avoid breaking
// existing queries. This route casts the response to access it.

interface UserRowWithPassword {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  password_hash: string | null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email as string)?.trim();
    const password = (body.password as string)?.trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('id, email, full_name, role, avatar_url, password_hash')
      .eq('email', email)
      .single();

    if (queryError || !user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Cast to include password_hash — safe once the column is added to the table
    const userWithPassword = user as unknown as UserRowWithPassword;

    if (!userWithPassword.password_hash) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, userWithPassword.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const session = await createSession({
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      avatarUrl: user.avatar_url,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
      },
    });

    response.cookies.set(
      session.cookie.name,
      session.cookie.value,
      session.cookie.options as Parameters<typeof response.cookies.set>[2]
    );

    try {
      const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;
      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        userName: user.full_name,
        action: 'login',
        entityType: 'user',
        entityId: user.id,
        entityName: user.full_name ?? user.email,
        ipAddress: ip,
      });
    } catch (_error) {
      // Audit logging should not block login.
    }

    return response;
  } catch (error) {
    logProductionRuntimeError('api-auth-login', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
