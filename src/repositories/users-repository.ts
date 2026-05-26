import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type DbUser = Database['public']['Tables']['users']['Row'];

const userSelect = 'id,email,full_name,role,avatar_url,created_at,updated_at';

async function getClient(client?: SupabaseClient<Database>) {
  return client ?? (await createServerSupabaseClient());
}

export async function listUsers(client?: SupabaseClient<Database>): Promise<DbUser[]> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('users')
    .select(userSelect)
    .order('full_name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listUsersByIds(
  userIds: string[],
  client?: SupabaseClient<Database>
): Promise<DbUser[]> {
  if (userIds.length === 0) {
    return [];
  }

  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('users')
    .select(userSelect)
    .in('id', userIds);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getUserById(
  userId: string,
  client?: SupabaseClient<Database>
): Promise<DbUser | null> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('users')
    .select(userSelect)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function insertUser(
  payload: Database['public']['Tables']['users']['Insert'],
  client?: SupabaseClient<Database>
): Promise<DbUser> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('users')
    .insert(payload)
    .select(userSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
