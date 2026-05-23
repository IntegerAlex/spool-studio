import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type DbAsset = Database['public']['Tables']['content_assets']['Row'];
export type DbAssetSummary = Pick<
  DbAsset,
  'client_id' | 'status' | 'assigned_to' | 'scheduled_at' | 'created_at'
>;

async function getClient(client?: SupabaseClient<Database>) {
  return client ?? (await createServerSupabaseClient());
}

export async function listAssets(client?: SupabaseClient<Database>): Promise<DbAsset[]> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('content_assets')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listAssetSummaries(
  client?: SupabaseClient<Database>
): Promise<DbAssetSummary[]> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('content_assets')
    .select('client_id,status,assigned_to,scheduled_at,created_at');

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listAssetsByClientId(
  clientId: string,
  client?: SupabaseClient<Database>
): Promise<DbAsset[]> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('content_assets')
    .select('*')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getAssetById(
  assetId: string,
  client?: SupabaseClient<Database>
): Promise<DbAsset | null> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('content_assets')
    .select('*')
    .eq('id', assetId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function insertAsset(
  payload: Database['public']['Tables']['content_assets']['Insert'],
  client?: SupabaseClient<Database>
): Promise<DbAsset> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('content_assets')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateAsset(
  assetId: string,
  updates: Database['public']['Tables']['content_assets']['Update'],
  client?: SupabaseClient<Database>
): Promise<DbAsset> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('content_assets')
    .update(updates)
    .eq('id', assetId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteAsset(
  assetId: string,
  client?: SupabaseClient<Database>
): Promise<void> {
  const supabase = await getClient(client);
  const { error } = await supabase.from('content_assets').delete().eq('id', assetId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function listRevisionsByAssetId(
  assetId: string,
  client?: SupabaseClient<Database>
): Promise<Database['public']['Tables']['asset_revisions']['Row'][]> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('asset_revisions')
    .select('*')
    .eq('asset_id', assetId)
    .order('version_number', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
