import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { User } from '@/types/index';
import { getUserById, insertUser, listUsers } from '@/repositories/users-repository';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

function mapUser(user: Awaited<ReturnType<typeof getUserById>>): User | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.full_name ?? user.email,
    role: user.role,
    avatar: user.avatar_url ?? undefined,
    createdAt: new Date(user.created_at),
  };
}

export async function getCurrentUserProfile(): Promise<User | null> {
  try {
    return await getOrCreateCurrentUserProfile();
  } catch (error) {
    logProductionRuntimeError('current-user-profile', error);
    return null;
  }
}

export async function getOrCreateCurrentUserProfile(): Promise<User> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  const existing = await getUserById(user.id, supabase);
  if (existing) {
    const mapped = mapUser(existing);
    if (!mapped) {
      throw new Error('Failed to map user profile');
    }
    return mapped;
  }

  if (!user.email) {
    throw new Error('Authenticated user is missing email');
  }

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email;

  const inserted = await insertUser(
    {
      id: user.id,
      email: user.email,
      full_name: fullName,
      avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    },
    supabase
  );

  const mapped = mapUser(inserted);
  if (!mapped) {
    throw new Error('Failed to map user profile');
  }

  return mapped;
}

export async function getUsers(): Promise<User[]> {
  try {
    const rows = await listUsers();
    return rows
      .map((user) => mapUser(user))
      .filter((user): user is User => Boolean(user));
  } catch (error) {
    logProductionRuntimeError('users-loader', error);
    return [];
  }
}
