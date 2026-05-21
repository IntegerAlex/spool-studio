import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type DbAssetComment = Database['public']['Tables']['asset_comments']['Row'];

async function getClient(client?: SupabaseClient<Database>) {
  return client ?? (await createServerSupabaseClient());
}

export async function listCommentsByAssetId(
  assetId: string,
  client?: SupabaseClient<Database>
): Promise<DbAssetComment[]> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('asset_comments')
    .select('*')
    .eq('asset_id', assetId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getCommentById(
  commentId: string,
  client?: SupabaseClient<Database>
): Promise<DbAssetComment | null> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('asset_comments')
    .select('*')
    .eq('id', commentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function insertComment(
  payload: Database['public']['Tables']['asset_comments']['Insert'],
  client?: SupabaseClient<Database>
): Promise<DbAssetComment> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('asset_comments')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateComment(
  commentId: string,
  updates: Database['public']['Tables']['asset_comments']['Update'],
  client?: SupabaseClient<Database>
): Promise<DbAssetComment> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('asset_comments')
    .update(updates)
    .eq('id', commentId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteComment(
  commentId: string,
  client?: SupabaseClient<Database>
): Promise<void> {
  const supabase = await getClient(client);
  const { error } = await supabase.from('asset_comments').delete().eq('id', commentId);
  if (error) {
    throw new Error(error.message);
  }
}
