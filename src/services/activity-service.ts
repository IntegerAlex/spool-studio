import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { AssetActivityLog } from '@/types/index';
import {
  insertActivity,
  listActivityByAssetId,
} from '@/repositories/asset-activity-repository';
import { getOrCreateCurrentUserProfile } from '@/services/users-service';
import type { Json } from '@/types/database';

export interface ActivityInput {
  assetId: string;
  action: string;
  metadata?: Record<string, unknown>;
}

function toJson(value: unknown): Json {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJson(item));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        toJson(nestedValue),
      ])
    );
  }

  return null;
}

function mapActivity(row: Awaited<ReturnType<typeof insertActivity>>): AssetActivityLog {
  return {
    id: row.id,
    assetId: row.asset_id,
    userId: row.user_id,
    action: row.action,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: new Date(row.created_at),
  };
}

export async function getAssetActivity(assetId: string): Promise<AssetActivityLog[]> {
  const rows = await listActivityByAssetId(assetId);
  return rows.map((row) => mapActivity(row));
}

export async function logAssetActivity(input: ActivityInput): Promise<AssetActivityLog> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  await getOrCreateCurrentUserProfile();

  const record = await insertActivity(
    {
      asset_id: input.assetId,
      user_id: user.id,
      action: input.action,
      metadata: toJson(input.metadata ?? {}),
    },
    supabase
  );

  return mapActivity(record);
}
