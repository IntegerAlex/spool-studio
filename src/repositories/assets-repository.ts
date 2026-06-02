import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type DbAsset = Database['public']['Tables']['content_assets']['Row'];
export type DbAssetSummary = Pick<
  DbAsset,
  | 'client_id'
  | 'status'
  | 'assigned_to'
  | 'scheduled_at'
  | 'publish_date'
  | 'publish_time'
  | 'published_at'
  | 'approved_at'
  | 'created_at'
  | 'type'
>;

export type DbDashboardAssetSummary = Pick<
  DbAsset,
  | 'status'
  | 'publish_date'
  | 'publish_time'
  | 'published_at'
>;

export type DbKanbanAsset = Pick<
  DbAsset,
  | 'id'
  | 'client_id'
  | 'title'
  | 'type'
  | 'status'
  | 'mime_type'
  | 'file_extension'
  | 'thumbnail_url'
  | 'assigned_to'
  | 'publish_date'
  | 'created_at'
  | 'updated_at'
>;

const assetSelect =
  'id,client_id,title,type,status,mime_type,file_size,file_extension,uploaded_at,uploaded_by,drive_file_id,drive_file_url,drive_folder_id,drive_folder_url,thumbnail_url,media_width,media_height,duration_seconds,created_by,created_at,updated_at,scheduled_at,publish_date,publish_time,scheduled_by,published_at,approved_at,approved_by,google_calendar_event_id,google_calendar_event_url,calendar_synced_at,assigned_to,current_revision_id,latest_revision_id,revision_count';

const dashboardSummarySelect = 'status,publish_date,publish_time,published_at';
const kanbanAssetSelect =
  'id,client_id,title,type,status,mime_type,file_extension,thumbnail_url,assigned_to,publish_date,created_at,updated_at';

async function getClient(client?: SupabaseClient<Database>) {
  return client ?? (await createServerSupabaseClient());
}

export async function listAssets(client?: SupabaseClient<Database>): Promise<DbAsset[]> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('content_assets')
    .select(assetSelect)
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
    .select('client_id,status,assigned_to,scheduled_at,publish_date,publish_time,published_at,approved_at,created_at,type');

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listDashboardAssetSummaries(
  client?: SupabaseClient<Database>
): Promise<DbDashboardAssetSummary[]> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('content_assets')
    .select(dashboardSummarySelect);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listKanbanAssets(
  client?: SupabaseClient<Database>
): Promise<DbKanbanAsset[]> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('content_assets')
    .select(kanbanAssetSelect)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listAssetsByIds(
  ids: string[],
  client?: SupabaseClient<Database>
): Promise<Pick<DbAsset, 'id' | 'title' | 'type' | 'status' | 'publish_date' | 'publish_time' | 'published_at' | 'thumbnail_url'>[]> {
  if (!ids || ids.length === 0) return [];
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('content_assets')
    .select('id,title,type,status,publish_date,publish_time,published_at,thumbnail_url')
    .in('id', ids)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getWeeklyCountsGroupedByClient(
  weekStartIso: string,
  client?: SupabaseClient<Database>
): Promise<{ client_id: string; weekly_count: number }[]> {
  const supabase = await getClient(client);
  // Call Postgres function created by migration: clients_weekly_counts(week_start timestamptz)
  const { data, error } = await supabase.rpc('clients_weekly_counts', { week_start: weekStartIso });
  if (error) {
    throw new Error(error.message);
  }

  return (data as any) ?? [];
}

export async function listAssetsByClientId(
  clientId: string,
  client?: SupabaseClient<Database>
): Promise<DbAsset[]> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('content_assets')
    .select(assetSelect)
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
    .select(assetSelect)
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
    .select(assetSelect)
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
    .select(assetSelect)
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
  
  // Set current_revision_id and latest_revision_id to null first to avoid circular reference key violations
  await supabase
    .from('content_assets')
    .update({ current_revision_id: null, latest_revision_id: null })
    .eq('id', assetId);

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
    .select(
      'id,asset_id,version_number,uploaded_by,uploaded_at,drive_file_id,drive_file_url,file_size,mime_type,media_width,media_height,duration_seconds,change_note,metadata,created_at'
    )
    .eq('asset_id', assetId)
    .order('version_number', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
