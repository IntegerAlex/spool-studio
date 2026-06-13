import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type DbAsset = Database['public']['Tables']['content_assets']['Row'];

async function getClient(client?: SupabaseClient<Database>) {
  return client ?? (await createServerSupabaseClient());
}

/**
 * Lists published assets for a given client within a date range.
 * The date range is applied against the resolved reporting date for each asset:
 * 1. published_at
 * 2. publish_date (fallback)
 * 3. created_at (fallback)
 */
export async function listClientAssetsForReport(
  clientId: string,
  startDate: Date,
  endDate: Date,
  client?: SupabaseClient<Database>
): Promise<DbAsset[]> {
  const supabase = await getClient(client);

  const { data, error } = await supabase
    .from('content_assets')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'published');

  if (error) {
    throw new Error(error.message);
  }

  const assets = data ?? [];

  return assets.filter((asset) => {
    let resolvedDate: Date;

    if (asset.published_at) {
      resolvedDate = new Date(asset.published_at);
    } else if (asset.publish_date) {
      // If publish_time exists, combine them to prevent timezone shift issues, otherwise use date
      const timePart = asset.publish_time ?? '00:00:00';
      resolvedDate = new Date(`${asset.publish_date}T${timePart}`);
    } else {
      resolvedDate = new Date(asset.created_at);
    }

    return resolvedDate >= startDate && resolvedDate <= endDate;
  });
}
