import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

export async function GET() {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, avatar_url')
      .eq('id', authUser.id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (error) {
    logProductionRuntimeError('api-auth-me', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
