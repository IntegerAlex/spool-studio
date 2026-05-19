import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { User } from '@/types/index';
import { getUserById, listUsers } from '@/repositories/users-repository';

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
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const profile = await getUserById(user.id, supabase);
  return mapUser(profile);
}

export async function getUsers(): Promise<User[]> {
  const rows = await listUsers();
  return rows
    .map((user) => mapUser(user))
    .filter((user): user is User => Boolean(user));
}
