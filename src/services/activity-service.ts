import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { AssetActivityLog } from '@/types/index';
import {
  insertActivity,
  listActivityByAssetId,
} from '@/repositories/asset-activity-repository';
import { getOrCreateCurrentUserProfile, getUsersByIds } from '@/services/users-service';
import type { Json } from '@/types/database';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';
import { emitEvent } from '@/lib/event-bus';

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

export async function getAssetActivity(
  assetId: string,
  options?: { limit?: number }
): Promise<AssetActivityLog[]> {
  try {
    const rows = await listActivityByAssetId(assetId, undefined, options);
    return rows.map((row) => mapActivity(row));
  } catch (error) {
    logProductionRuntimeError('activity-loader', error, { assetId });
    return [];
  }
}

export async function getAssetActivityWithUsers(
  assetId: string,
  options?: { limit?: number }
): Promise<{ activity: AssetActivityLog[]; users: Awaited<ReturnType<typeof getUsersByIds>> }> {
  const activity = await getAssetActivity(assetId, options);
  const userIds = Array.from(new Set(activity.map((entry) => entry.userId).filter(Boolean))) as string[];
  const users = await getUsersByIds(userIds);
  return { activity, users };
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

  const mapped = mapActivity(record);

  try {
    emitEvent({
      type: 'asset.activity',
      payload: {
        id: mapped.id,
        assetId: input.assetId,
        action: input.action,
        metadata: input.metadata ?? {},
        createdAt: mapped.createdAt.toISOString(),
      },
    });
  } catch (_err) {
    // non-blocking - event bus is in-memory only
  }

  return mapped;
}
