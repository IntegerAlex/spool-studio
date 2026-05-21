import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type DbAssetActivity = Database['public']['Tables']['asset_activity_logs']['Row'];

async function getClient(client?: SupabaseClient<Database>) {
  return client ?? (await createServerSupabaseClient());
}

export async function listActivityByAssetId(
  assetId: string,
  client?: SupabaseClient<Database>
): Promise<DbAssetActivity[]> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('asset_activity_logs')
    .select('*')
    .eq('asset_id', assetId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function insertActivity(
  payload: Database['public']['Tables']['asset_activity_logs']['Insert'],
  client?: SupabaseClient<Database>
): Promise<DbAssetActivity> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('asset_activity_logs')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
