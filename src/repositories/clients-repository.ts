import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type DbClient = Database['public']['Tables']['clients']['Row'];

async function getClient(client?: SupabaseClient<Database>) {
  return client ?? (await createServerSupabaseClient());
}

export async function listClients(client?: SupabaseClient<Database>): Promise<DbClient[]> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getClientById(
  clientId: string,
  client?: SupabaseClient<Database>
): Promise<DbClient | null> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function insertClient(
  payload: Database['public']['Tables']['clients']['Insert'],
  client?: SupabaseClient<Database>
): Promise<DbClient> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('clients')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateClient(
  clientId: string,
  updates: Database['public']['Tables']['clients']['Update'],
  client?: SupabaseClient<Database>
): Promise<DbClient> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', clientId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteClient(
  clientId: string,
  client?: SupabaseClient<Database>
): Promise<void> {
  const supabase = await getClient(client);
  const { error } = await supabase.from('clients').delete().eq('id', clientId);
  if (error) {
    throw new Error(error.message);
  }
}
