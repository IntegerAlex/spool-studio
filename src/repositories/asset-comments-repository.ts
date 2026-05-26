import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type DbAssetComment = Database['public']['Tables']['asset_comments']['Row'];

const commentSelect = 'id,asset_id,user_id,type,message,revision_status,created_at,updated_at';

async function getClient(client?: SupabaseClient<Database>) {
  return client ?? (await createServerSupabaseClient());
}

export async function listCommentsByAssetId(
  assetId: string,
  client?: SupabaseClient<Database>,
  options?: { limit?: number; offset?: number }
): Promise<DbAssetComment[]> {
  const supabase = await getClient(client);
  let query = supabase
    .from('asset_comments')
    .select(commentSelect)
    .eq('asset_id', assetId)
    .order('created_at', { ascending: true });

  if (options?.limit !== undefined) {
    const offset = options.offset ?? 0;
    query = query.range(offset, offset + Math.max(options.limit, 1) - 1);
  }

  const { data, error } = await query;

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
    .select(commentSelect)
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
    .select(commentSelect)
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
    .select(commentSelect)
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
