import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type DbClient = Database['public']['Tables']['clients']['Row'];

const clientSelect =
  'id,name,slug,instagram_handle,brand_color,monthly_reels_target,monthly_posts_target,monthly_goal,weekly_goal,weekly_poster_goal,weekly_reel_goal,created_by,created_at,updated_at,contract_start_date,contract_end_date';
const clientOptionSelect = 'id,name';

async function getClient(client?: any) {
  return client ?? (await createServerSupabaseClient());
}

export async function listClients(client?: any): Promise<DbClient[]> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('clients')
    .select(clientSelect)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }



  return data ?? [];
}

export async function listClientOptions(
  client?: any
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

export async function countClients(client?: any): Promise<number> {
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
  client?: any
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
  client?: any
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
  client?: any
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
  client?: any
): Promise<void> {
  const supabase = await getClient(client);
  const { error } = await supabase.from('clients').delete().eq('id', clientId);
  if (error) {
    throw new Error(error.message);
  }
}
