import { createServerSupabaseClient } from '@/lib/supabase/server';
import { canTransitionStatus } from '@/lib/asset-workflow';
import type { Asset } from '@/types/index';
import { getOrCreateCurrentUserProfile } from '@/services/users-service';
import { logAssetActivity } from '@/services/activity-service';
import { getAssetDriveFolder } from '@/integrations/google-drive/folder-service';
import {
  deleteAsset as deleteAssetRow,
  getAssetById,
  insertAsset,
  listAssets,
  listAssetsByClientId,
  updateAsset as updateAssetRow,
} from '@/repositories/assets-repository';
import { getClientById } from '@/repositories/clients-repository';
import { getUserById } from '@/repositories/users-repository';
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
    driveFolderId: asset.drive_folder_id ?? undefined,
    driveFolderUrl: asset.drive_folder_url ?? undefined,
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

async function resolveDriveFolderMetadata(
  clientId: string,
  assetType: Database['public']['Enums']['asset_type'],
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  assetId?: string
): Promise<Pick<Database['public']['Tables']['content_assets']['Update'], 'drive_folder_id' | 'drive_folder_url'> | null> {
  const client = await getClientById(clientId, supabase);
  if (!client) {
    console.warn('[assets-service] Drive folder lookup skipped: client not found', {
      assetId,
      clientId,
      assetType,
    });
    return null;
  }

  if (!client.drive_folder_id) {
    console.warn('[assets-service] Drive folder lookup skipped: client root folder missing', {
      assetId,
      clientId,
      assetType,
    });
    return null;
  }

  try {
    const folder = await getAssetDriveFolder(client.drive_folder_id, assetType);
    if (!folder) {
      console.warn('[assets-service] Drive folder lookup skipped: destination folder missing', {
        assetId,
        clientId,
        assetType,
        clientDriveFolderId: client.drive_folder_id,
      });
      return null;
    }

    return {
      drive_folder_id: folder.id,
      drive_folder_url: folder.url,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve Drive folder';
    console.error('[assets-service] Drive folder lookup failed', {
      assetId,
      clientId,
      assetType,
      clientDriveFolderId: client.drive_folder_id,
      error: message,
    });
    return null;
  }
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

  await getOrCreateCurrentUserProfile();

  if (input.status === 'scheduled' && !input.scheduledAt) {
    throw new Error('Scheduled assets require a scheduled date');
  }

  if (input.assignedTo) {
    const assignedUser = await getUserById(input.assignedTo, supabase);
    if (!assignedUser) {
      throw new Error('Assigned user not found');
    }
  }

  const record = await insertAsset(
    {
      client_id: input.clientId,
      title: input.title,
      type: input.type,
      status: input.status ?? 'draft',
      drive_file_url: input.driveFileUrl ?? null,
      drive_folder_id: null,
      drive_folder_url: null,
      thumbnail_url: input.thumbnailUrl ?? null,
      assigned_to: input.assignedTo ?? null,
      created_by: user.id,
      scheduled_at: input.scheduledAt ?? null,
    },
    supabase
  );

  let storedRecord = record;
  const driveFolderMetadata = await resolveDriveFolderMetadata(input.clientId, input.type, supabase, record.id);

  if (
    driveFolderMetadata &&
    (record.drive_folder_id !== driveFolderMetadata.drive_folder_id ||
      record.drive_folder_url !== driveFolderMetadata.drive_folder_url)
  ) {
    try {
      storedRecord = await updateAssetRow(record.id, driveFolderMetadata, supabase);
      const persistedRecord = await getAssetById(record.id, supabase);
      if (persistedRecord) {
        storedRecord = persistedRecord;
      }

      console.info('[assets-service] Drive folder metadata persistence succeeded', {
        assetId: record.id,
        clientId: input.clientId,
        assetType: input.type,
        driveFolderId: storedRecord.drive_folder_id,
        driveFolderUrl: storedRecord.drive_folder_url,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to persist Drive folder metadata';
      console.error('[assets-service] Drive folder metadata persistence failed', {
        assetId: record.id,
        clientId: input.clientId,
        assetType: input.type,
        error: message,
      });
    }
  }

  const mapped = mapAsset(storedRecord);
  if (!mapped) {
    throw new Error('Failed to map asset');
  }

  try {
    await logAssetActivity({
      assetId: mapped.id,
      action: 'asset_created',
      metadata: {
        title: mapped.title,
        type: mapped.type,
        status: mapped.status,
      },
    });
  } catch (_error) {
    // Activity logging should not block asset creation.
  }

  return mapped;
}

export async function updateAsset(
  assetId: string,
  input: Partial<AssetInput>
): Promise<Asset> {
  const supabase = await createServerSupabaseClient();
  const existing = await getAssetById(assetId);
  if (!existing) {
    throw new Error('Asset not found');
  }

  if (input.status !== undefined) {
    if (!canTransitionStatus(existing.status, input.status)) {
      throw new Error('Invalid status transition');
    }

    const scheduledAt = input.scheduledAt ?? existing.scheduled_at;
    if (input.status === 'scheduled' && !scheduledAt) {
      throw new Error('Scheduled assets require a scheduled date');
    }
  }

  const updates: Record<string, unknown> = {};
  if (input.clientId !== undefined) updates.client_id = input.clientId;
  if (input.title !== undefined) updates.title = input.title;
  if (input.type !== undefined) updates.type = input.type;
  if (input.status !== undefined) updates.status = input.status;
  if (input.driveFileUrl !== undefined) updates.drive_file_url = input.driveFileUrl;
  const driveFolderTargetChanged = input.clientId !== undefined || input.type !== undefined;
  if (driveFolderTargetChanged) {
    updates.drive_folder_id = null;
    updates.drive_folder_url = null;
  }
  if (input.thumbnailUrl !== undefined) updates.thumbnail_url = input.thumbnailUrl;
  if (input.assignedTo !== undefined) updates.assigned_to = input.assignedTo;
  if (input.scheduledAt !== undefined) updates.scheduled_at = input.scheduledAt;

  let record = await updateAssetRow(assetId, updates as Parameters<typeof updateAssetRow>[1], supabase);

  const targetClientId = input.clientId ?? existing.client_id;
  const targetAssetType = input.type ?? existing.type;
  const shouldResolveDriveFolder = driveFolderTargetChanged || !record.drive_folder_id || !record.drive_folder_url;

  if (shouldResolveDriveFolder) {
    const driveFolderMetadata = await resolveDriveFolderMetadata(targetClientId, targetAssetType, supabase, assetId);
    if (
      driveFolderMetadata &&
      (record.drive_folder_id !== driveFolderMetadata.drive_folder_id ||
        record.drive_folder_url !== driveFolderMetadata.drive_folder_url)
    ) {
      try {
        record = await updateAssetRow(assetId, driveFolderMetadata, supabase);
        const persistedRecord = await getAssetById(assetId, supabase);
        if (persistedRecord) {
          record = persistedRecord;
        }

        console.info('[assets-service] Drive folder metadata persistence succeeded', {
          assetId,
          clientId: targetClientId,
          assetType: targetAssetType,
          driveFolderId: record.drive_folder_id,
          driveFolderUrl: record.drive_folder_url,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to persist Drive folder metadata';
        console.error('[assets-service] Drive folder metadata persistence failed', {
          assetId,
          clientId: targetClientId,
          assetType: targetAssetType,
          error: message,
        });
      }
    }
  }

  const mapped = mapAsset(record);
  if (!mapped) {
    throw new Error('Failed to map asset');
  }

  const statusChanged = input.status !== undefined && input.status !== existing.status;
  const assignmentChanged =
    input.assignedTo !== undefined && input.assignedTo !== existing.assigned_to;

  if (statusChanged) {
    try {
      await logAssetActivity({
        assetId,
        action: 'status_changed',
        metadata: {
          from: existing.status,
          to: input.status,
        },
      });
    } catch (_error) {
      // Activity logging should not block updates.
    }
  }

  if (assignmentChanged) {
    try {
      await logAssetActivity({
        assetId,
        action: 'assignment_changed',
        metadata: {
          from: existing.assigned_to ?? null,
          to: input.assignedTo ?? null,
        },
      });
    } catch (_error) {
      // Activity logging should not block updates.
    }
  }

  return mapped;
}

export async function removeAsset(assetId: string): Promise<void> {
  await deleteAssetRow(assetId);
}
