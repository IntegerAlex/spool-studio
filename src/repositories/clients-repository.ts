import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type DbClient = Database['public']['Tables']['clients']['Row'];

const clientSelect =
  'id,name,slug,instagram_handle,brand_color,monthly_reels_target,monthly_posts_target,drive_folder_id,drive_folder_url,created_by,created_at,updated_at';
const clientOptionSelect = 'id,name';

async function getClient(client?: SupabaseClient<Database>) {
  return client ?? (await createServerSupabaseClient());
}

export async function listClients(client?: SupabaseClient<Database>): Promise<DbClient[]> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('clients')
    .select(clientSelect)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  console.info('[dashboard-debug][repository]', {
    operation: 'listClients',
    table: 'clients',
    repositoryResultCount: data?.length ?? 0,
  });

  return data ?? [];
}

export async function listClientOptions(
  client?: SupabaseClient<Database>
): Promise<Pick<DbClient, 'id' | 'name'>[]> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('clients')
    .select(clientOptionSelect)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function countClients(client?: SupabaseClient<Database>): Promise<number> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('clients')
    .select('id', { count: 'exact' });

  if (error) {
    throw new Error(error.message);
  }

  console.info('[dashboard-debug][supabase]', {
    operation: 'countClients',
    table: 'clients',
    rawSupabaseCount: data?.length ?? 0,
  });

  console.info('[dashboard-debug][repository]', {
    operation: 'countClients',
    table: 'clients',
    repositoryResultCount: data?.length ?? 0,
  });

  return data?.length ?? 0;
}

export async function getClientById(
  clientId: string,
  client?: SupabaseClient<Database>
): Promise<DbClient | null> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('clients')
    .select(clientSelect)
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
    .select(clientSelect)
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
    .select(clientSelect)
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
