import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type DbUser = Database['public']['Tables']['users']['Row'];

async function getClient(client?: SupabaseClient<Database>) {
  return client ?? (await createServerSupabaseClient());
}

export async function listUsers(client?: SupabaseClient<Database>): Promise<DbUser[]> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('full_name', { ascending: true });

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
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}
