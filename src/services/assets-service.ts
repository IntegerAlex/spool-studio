import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Asset } from '@/types/index';
import {
  deleteAsset as deleteAssetRow,
  getAssetById,
  insertAsset,
  listAssets,
  listAssetsByClientId,
  updateAsset as updateAssetRow,
} from '@/repositories/assets-repository';
import type { Database } from '@/types/database';

export interface AssetInput {
  clientId: string;
  title: string;
  type: Database['public']['Enums']['asset_type'];
  status?: Database['public']['Enums']['asset_status'];
  driveFileUrl?: string;
  thumbnailUrl?: string;
  assignedTo?: string | null;
  scheduledAt?: string | null;
}

function mapAsset(asset: Awaited<ReturnType<typeof getAssetById>>): Asset | null {
  if (!asset) {
    return null;
  }

  return {
    id: asset.id,
    clientId: asset.client_id,
    title: asset.title,
    description: undefined,
    type: asset.type,
    status: asset.status,
    fileUrl: asset.drive_file_url ?? undefined,
    driveFileUrl: asset.drive_file_url ?? undefined,
    thumbnailUrl: asset.thumbnail_url ?? undefined,
    createdBy: asset.created_by,
    createdAt: new Date(asset.created_at),
    updatedAt: new Date(asset.updated_at),
    scheduledAt: asset.scheduled_at ? new Date(asset.scheduled_at) : null,
    assignedTo: asset.assigned_to ? [asset.assigned_to] : [],
    revisions: [],
    comments: [],
  };
}

export async function getAssets(): Promise<Asset[]> {
  const rows = await listAssets();
  return rows
    .map((asset) => mapAsset(asset))
    .filter((asset): asset is Asset => Boolean(asset));
}

export async function getAssetsByClientId(clientId: string): Promise<Asset[]> {
  const rows = await listAssetsByClientId(clientId);
  return rows
    .map((asset) => mapAsset(asset))
    .filter((asset): asset is Asset => Boolean(asset));
}

export async function getAssetDetail(assetId: string): Promise<Asset | null> {
  const row = await getAssetById(assetId);
  return mapAsset(row);
}

export async function createAsset(input: AssetInput): Promise<Asset> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  const record = await insertAsset(
    {
      client_id: input.clientId,
      title: input.title,
      type: input.type,
      status: input.status ?? 'draft',
      drive_file_url: input.driveFileUrl ?? null,
      thumbnail_url: input.thumbnailUrl ?? null,
      assigned_to: input.assignedTo ?? null,
      created_by: user.id,
      scheduled_at: input.scheduledAt ?? null,
    },
    supabase
  );

  const mapped = mapAsset(record);
  if (!mapped) {
    throw new Error('Failed to map asset');
  }

  return mapped;
}

export async function updateAsset(
  assetId: string,
  input: Partial<AssetInput>
): Promise<Asset> {
  const updates: Record<string, unknown> = {};
  if (input.clientId !== undefined) updates.client_id = input.clientId;
  if (input.title !== undefined) updates.title = input.title;
  if (input.type !== undefined) updates.type = input.type;
  if (input.status !== undefined) updates.status = input.status;
  if (input.driveFileUrl !== undefined) updates.drive_file_url = input.driveFileUrl;
  if (input.thumbnailUrl !== undefined) updates.thumbnail_url = input.thumbnailUrl;
  if (input.assignedTo !== undefined) updates.assigned_to = input.assignedTo;
  if (input.scheduledAt !== undefined) updates.scheduled_at = input.scheduledAt;

  const record = await updateAssetRow(
    assetId,
    updates as Parameters<typeof updateAssetRow>[1]
  );

  const mapped = mapAsset(record);
  if (!mapped) {
    throw new Error('Failed to map asset');
  }

  return mapped;
}

export async function removeAsset(assetId: string): Promise<void> {
  await deleteAssetRow(assetId);
}
