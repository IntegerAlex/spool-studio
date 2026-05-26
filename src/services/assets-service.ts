import { createServerSupabaseClient } from '@/lib/supabase/server';
import { canTransitionStatus } from '@/lib/asset-workflow';
import type { Asset, AssetStatus } from '@/types/index';
import { getOrCreateCurrentUserProfile } from '@/services/users-service';
import { logAssetActivity } from '@/services/activity-service';
import { getAssetDriveFolder } from '@/integrations/google-drive/folder-service';
import { uploadFileToFolder, type DriveUploadResult } from '@/integrations/google-drive/drive-service';
import { extractAssetMetadata } from '@/lib/asset-metadata';
import {
  sendAssetUploadNotification,
  sendRevisionUploadNotification,
} from '@/lib/notifications/mailgun';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';
import {
  deleteAsset as deleteAssetRow,
  getAssetById,
  insertAsset,
  listAssets,
  listAssetsByClientId,
  updateAsset as updateAssetRow,
  listRevisionsByAssetId,
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
  publishDate?: string | null;
  publishTime?: string | null;
  scheduledBy?: string | null;
  publishedAt?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
}

function splitScheduledAt(value?: string | null): { publishDate: string | null; publishTime: string | null } {
  if (!value) {
    return { publishDate: null, publishTime: null };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { publishDate: null, publishTime: null };
  }

  return {
    publishDate: parsed.toISOString().slice(0, 10),
    publishTime: parsed.toISOString().slice(11, 19),
  };
}

function combinePublishDateTime(
  publishDate?: string | null,
  publishTime?: string | null,
  scheduledAt?: string | null
): Date | null {
  if (scheduledAt) {
    const fallback = new Date(scheduledAt);
    if (!Number.isNaN(fallback.getTime())) {
      return fallback;
    }
  }

  if (!publishDate) {
    return null;
  }

  const parsed = new Date(`${publishDate}T${publishTime ?? '00:00:00'}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapAsset(asset: Awaited<ReturnType<typeof getAssetById>>): Asset | null {
  if (!asset) {
    return null;
  }

  const scheduledAt = combinePublishDateTime(asset.publish_date, asset.publish_time, asset.scheduled_at);

  return {
    id: asset.id,
    clientId: asset.client_id,
    title: asset.title,
    description: undefined,
    type: asset.type,
    status: asset.status,
    mimeType: asset.mime_type ?? undefined,
    fileSize: asset.file_size ?? undefined,
    fileExtension: asset.file_extension ?? undefined,
    uploadedAt: asset.uploaded_at ? new Date(asset.uploaded_at) : null,
    uploadedBy: asset.uploaded_by ?? undefined,
    driveFileId: asset.drive_file_id ?? undefined,
    fileUrl: asset.drive_file_url ?? undefined,
    driveFileUrl: asset.drive_file_url ?? undefined,
    driveFolderId: asset.drive_folder_id ?? undefined,
    driveFolderUrl: asset.drive_folder_url ?? undefined,
    thumbnailUrl: asset.thumbnail_url ?? undefined,
    mediaWidth: asset.media_width ?? undefined,
    mediaHeight: asset.media_height ?? undefined,
    durationSeconds: asset.duration_seconds ?? undefined,
    createdBy: asset.created_by,
    createdAt: new Date(asset.created_at),
    updatedAt: new Date(asset.updated_at),
    scheduledAt,
    publishDate: asset.publish_date ?? null,
    publishTime: asset.publish_time ?? null,
    scheduledBy: asset.scheduled_by ?? null,
    publishedAt: asset.published_at ? new Date(asset.published_at) : null,
    approvedAt: asset.approved_at ? new Date(asset.approved_at) : null,
    approvedBy: asset.approved_by ?? null,
    googleCalendarEventId: asset.google_calendar_event_id ?? null,
    googleCalendarEventUrl: asset.google_calendar_event_url ?? null,
    calendarSyncedAt: asset.calendar_synced_at ? new Date(asset.calendar_synced_at) : null,
    assignedTo: asset.assigned_to ? [asset.assigned_to] : [],
    revisions: [],
    currentRevisionId: asset.current_revision_id ?? undefined,
    latestRevision: undefined,
    revisionCount: asset.revision_count ?? undefined,
    comments: [],
  };
}

function mapAssetRevisions(
  revisions: Awaited<ReturnType<typeof listRevisionsByAssetId>>
): Asset['revisions'] {
  return revisions.map((rev) => ({
    id: rev.id,
    assetId: rev.asset_id,
    versionNumber: rev.version_number,
    uploadedBy: rev.uploaded_by ?? undefined,
    uploadedAt: new Date(rev.uploaded_at),
    driveFileId: rev.drive_file_id,
    driveFileUrl: rev.drive_file_url ?? undefined,
    fileSize: rev.file_size ?? undefined,
    mimeType: rev.mime_type ?? undefined,
    mediaWidth: rev.media_width ?? undefined,
    mediaHeight: rev.media_height ?? undefined,
    durationSeconds: rev.duration_seconds ?? undefined,
    changeNote: rev.change_note ?? undefined,
    metadata: rev.metadata ?? undefined,
    createdAt: new Date(rev.created_at),
  }));
}

function logUploadFailure(stage: string, error: unknown, assetId: string, extra: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : 'Unknown upload error';
  const stack = error instanceof Error ? error.stack ?? null : null;

  console.error('[upload][failure]', {
    assetId,
    stage,
    message,
    stack,
    ...extra,
  });
}

function logAssetStatusTransition(
  assetId: string,
  previousStatus: AssetStatus,
  nextStatus: AssetStatus,
  triggerSource: string
) {
  console.info('[asset][status-transition]', {
    assetId,
    previousStatus,
    nextStatus,
    triggerSource,
  });
}

async function transitionAssetStatus(
  assetId: string,
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  nextStatus: AssetStatus,
  triggerSource: string
): Promise<void> {
  const currentAsset = await getAssetById(assetId, supabase);
  if (!currentAsset) {
    throw new Error('Asset not found');
  }

  if (!canTransitionStatus(currentAsset.status, nextStatus)) {
    throw new Error(`Invalid status transition from ${currentAsset.status} to ${nextStatus}`);
  }

  if (currentAsset.status !== nextStatus) {
  }

  await updateAssetRow(assetId, { status: nextStatus }, supabase);
}

export async function resolveAssetDriveFolder(
  assetType: Database['public']['Enums']['asset_type'],
  clientId: string
): Promise<Awaited<ReturnType<typeof getAssetDriveFolder>> | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const client = await getClientById(clientId, supabase);

    if (!client?.drive_folder_id) {
      return null;
    }

    return getAssetDriveFolder(client.drive_folder_id, assetType);
  } catch (error) {
    logProductionRuntimeError('asset-drive-folder', error, {
      assetType,
      clientId,
    });
    return null;
  }
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
  try {
    const rows = await listAssets();
    return rows
      .map((asset) => mapAsset(asset))
      .filter((asset): asset is Asset => Boolean(asset));
  } catch (error) {
    logProductionRuntimeError('assets-loader', error);
    return [];
  }
}

export async function getAssetsByClientId(clientId: string): Promise<Asset[]> {
  try {
    const rows = await listAssetsByClientId(clientId);
    return rows
      .map((asset) => mapAsset(asset))
      .filter((asset): asset is Asset => Boolean(asset));
  } catch (error) {
    logProductionRuntimeError('assets-by-client-loader', error, { clientId });
    return [];
  }
}

export async function getAssetDetail(assetId: string): Promise<Asset | null> {
  try {
    const row = await getAssetById(assetId);
    const mapped = mapAsset(row);
    if (!mapped) return null;
    try {
      const revisions = await listRevisionsByAssetId(assetId);
      mapped.revisions = mapAssetRevisions(revisions);
      // populate revision pointers/count from asset row
      mapped.currentRevisionId = row?.current_revision_id ?? undefined;
      mapped.revisionCount = row?.revision_count ?? mapped.revisions.length;
      if (row?.latest_revision_id) {
        const latest = revisions.find((r) => r.id === row.latest_revision_id);
        if (latest) {
          mapped.latestRevision = {
            id: latest.id,
            assetId: latest.asset_id,
            versionNumber: latest.version_number,
            uploadedBy: latest.uploaded_by ?? undefined,
            uploadedAt: new Date(latest.uploaded_at),
            driveFileId: latest.drive_file_id,
            driveFileUrl: latest.drive_file_url ?? undefined,
            fileSize: latest.file_size ?? undefined,
            mimeType: latest.mime_type ?? undefined,
            mediaWidth: latest.media_width ?? undefined,
            mediaHeight: latest.media_height ?? undefined,
            durationSeconds: latest.duration_seconds ?? undefined,
            changeNote: latest.change_note ?? undefined,
            metadata: latest.metadata ?? undefined,
            createdAt: new Date(latest.created_at),
          };
        }
      }
    } catch (error) {
      logProductionRuntimeError('asset-revisions-loader', error, { assetId });
      mapped.revisions = [];
    }

    return mapped;
  } catch (error) {
    logProductionRuntimeError('asset-detail-loader', error, { assetId });
    return null;
  }
}

export async function getAssetSummary(assetId: string): Promise<Asset | null> {
  try {
    const row = await getAssetById(assetId);
    return mapAsset(row);
  } catch (error) {
    logProductionRuntimeError('asset-summary-loader', error, { assetId });
    return null;
  }
}

export async function getAssetRevisions(assetId: string): Promise<Asset['revisions']> {
  try {
    const revisions = await listRevisionsByAssetId(assetId);
    return mapAssetRevisions(revisions);
  } catch (error) {
    logProductionRuntimeError('asset-revisions-loader', error, { assetId });
    return [];
  }
}

export async function setAssetCurrentRevision(assetId: string, revisionId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  // Ensure the revision belongs to the asset
  const { data: rev, error: revError } = await supabase
    .from('asset_revisions')
    .select('id,asset_id')
    .eq('id', revisionId)
    .maybeSingle();
  if (revError) {
    throw new Error(revError.message);
  }
  if (!rev || rev.asset_id !== assetId) {
    throw new Error('Revision not found for asset');
  }

  await updateAssetRow(assetId, { current_revision_id: revisionId }, supabase);
  try {
    await logAssetActivity({
      assetId,
      action: 'revision_activated',
      metadata: { revisionId },
    });
  } catch (_err) {
    // non-blocking
  }
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

  const scheduledFields = splitScheduledAt(input.scheduledAt);

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
      publish_date: input.publishDate ?? scheduledFields.publishDate,
      publish_time: input.publishTime ?? scheduledFields.publishTime,
      scheduled_by: input.scheduledBy ?? (input.scheduledAt ? user.id : null),
      published_at: input.publishedAt ?? null,
      approved_at: input.approvedAt ?? null,
      approved_by: input.approvedBy ?? null,
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

export interface AssetUploadResult {
  asset: Asset;
  upload: {
    driveFileId: string;
    driveFileUrl: string;
    mimeType: string;
    fileSize: number;
    uploadStatus: 'uploaded';
  };
}

export interface AssetUploadFinalizationInput {
  fileName: string;
  uploadResult: DriveUploadResult;
}

export async function finalizeAssetUpload(
  assetId: string,
  input: AssetUploadFinalizationInput
): Promise<AssetUploadResult> {
  const supabase = await createServerSupabaseClient();
  const [userResult, sessionResult] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);
  const {
    data: { user },
    error,
  } = userResult;

  console.info(
    '[upload][auth] ' +
      JSON.stringify({
        assetId,
        authSource: 'service-cookie-store',
        userExists: Boolean(user),
        sessionExists: Boolean(sessionResult.data.session),
        cookiesPresent: 'unknown',
      })
  );

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  await getOrCreateCurrentUserProfile();

  const asset = await getAssetById(assetId, supabase);
  if (!asset) {
    throw new Error('Asset not found');
  }

  let clientName = asset.client_id;
  try {
    const client = await getClientById(asset.client_id, supabase);
    clientName = client?.name ?? clientName;
  } catch (_error) {
    // Non-blocking: email can fall back to the client id.
  }

  const isRevisionUpload = Boolean(asset.drive_file_id || asset.uploaded_at || (asset.revision_count ?? 0) > 0);
  let revisionNotificationVersion: number | null = null;

  if (!isRevisionUpload) {
    await transitionAssetStatus(assetId, supabase, 'uploading', 'upload-start');
  }

  const folder = await resolveAssetDriveFolder(asset.type, asset.client_id);
  if (!folder) {
    throw new Error('Drive folder not found for asset');
  }

  console.info('[upload][asset-check]', {
    assetId,
    clientId: asset.client_id,
    assetType: asset.type,
    fileName: input.fileName,
    mimeType: input.uploadResult.mimeType || 'application/octet-stream',
    fileSize: input.uploadResult.fileSize,
  });

  console.info('[upload][folder-resolved]', {
    assetId,
    clientId: asset.client_id,
    assetType: asset.type,
    folderId: folder.id,
    folderUrl: folder.url,
  });

  console.info('[upload][drive-upload]', {
    assetId,
    clientId: asset.client_id,
    folderId: folder.id,
    fileName: input.fileName,
    mimeType: input.uploadResult.mimeType || 'application/octet-stream',
    fileSize: input.uploadResult.fileSize,
    uploadPayloadSize: input.uploadResult.fileSize,
  });

  const uploadedAt = new Date().toISOString();
  const fileExtension = input.fileName.includes('.') ? input.fileName.split('.').pop()?.toLowerCase() ?? null : null;

  const updates: Parameters<typeof updateAssetRow>[1] = {
    drive_file_id: input.uploadResult.driveFileId,
    drive_file_url: input.uploadResult.driveFileUrl,
    thumbnail_url: input.uploadResult.thumbnailLink ?? asset.thumbnail_url ?? null,
    mime_type: input.uploadResult.mimeType,
    file_size: input.uploadResult.fileSize,
    file_extension: fileExtension,
    uploaded_at: uploadedAt,
    uploaded_by: user.id,
    media_width: input.uploadResult.mediaWidth ?? null,
    media_height: input.uploadResult.mediaHeight ?? null,
    duration_seconds: input.uploadResult.durationSeconds ?? null,
  };

  if (!isRevisionUpload) {
    logAssetStatusTransition(assetId, 'uploading', 'uploaded', 'upload-success');
    updates.status = 'uploaded';
  } else {
    console.info('[asset][revision-upload]', {
      assetId,
      statusPreserved: asset.status,
    });
  }

  const updated = await updateAssetRow(assetId, updates, supabase);
  const persisted = await getAssetById(assetId, supabase);
  let mapped = mapAsset(persisted ?? updated);

  if (!mapped) {
    throw new Error('Failed to map asset');
  }

  console.info('[asset][metadata-extraction]', {
    assetId,
    mediaType: input.uploadResult.mimeType.startsWith('video/')
      ? 'video'
      : input.uploadResult.mimeType.startsWith('image/')
        ? 'image'
        : 'other',
    extractedFields: {
      mimeType: updates.mime_type,
      fileSize: updates.file_size,
      fileExtension: updates.file_extension,
      uploadedAt: updates.uploaded_at,
      uploadedBy: updates.uploaded_by,
      driveFileId: updates.drive_file_id,
      driveFileUrl: updates.drive_file_url,
      thumbnailUrl: updates.thumbnail_url,
      mediaWidth: updates.media_width,
      mediaHeight: updates.media_height,
      durationSeconds: updates.duration_seconds,
    },
    extractionDurationMs: 0,
    partialFailures: [],
  });

  try {
    await updateAssetRow(assetId, updates, supabase);
    const refreshed = await getAssetById(assetId, supabase);
    const refreshedMapped = mapAsset(refreshed);
    if (refreshedMapped) {
      mapped = refreshedMapped;
    }
    // Create an immutable revision record for this upload and update the asset's revision pointers
    try {
      const persistedAfterUpdate = await getAssetById(assetId, supabase);
      const currentCount = persistedAfterUpdate?.revision_count ?? 0;
      const versionNumber = (currentCount ?? 0) + 1;

      const revisionInsert = {
        asset_id: assetId,
        version_number: versionNumber,
        uploaded_by: user.id,
        uploaded_at: uploadedAt,
        drive_file_id: input.uploadResult.driveFileId,
        drive_file_url: input.uploadResult.driveFileUrl,
        file_size: input.uploadResult.fileSize,
        mime_type: input.uploadResult.mimeType,
        media_width: input.uploadResult.mediaWidth ?? null,
        media_height: input.uploadResult.mediaHeight ?? null,
        duration_seconds: input.uploadResult.durationSeconds ?? null,
        change_note: null,
        metadata: {
          fileName: input.fileName,
          mimeType: input.uploadResult.mimeType,
          fileSize: input.uploadResult.fileSize,
          mediaWidth: input.uploadResult.mediaWidth ?? null,
          mediaHeight: input.uploadResult.mediaHeight ?? null,
          durationSeconds: input.uploadResult.durationSeconds ?? null,
        },
      } as const;

      const { data: revisionData, error: revisionError } = await supabase.from('asset_revisions').insert(revisionInsert).select('*').single();
      if (revisionError) {
        console.error('[revision][create][failed]', { assetId, error: revisionError });
      } else if (revisionData) {
        revisionNotificationVersion = versionNumber;

        // update asset pointers to reference this new revision
        await updateAssetRow(
          assetId,
          {
            latest_revision_id: revisionData.id,
            current_revision_id: revisionData.id,
            revision_count: versionNumber,
          },
          supabase
        );

        try {
          await logAssetActivity({
            assetId,
            action: 'revision_created',
            metadata: {
              assetId,
              revisionId: revisionData.id,
              revisionNumber: versionNumber,
              driveFileId: input.uploadResult.driveFileId,
            },
          });
        } catch (_err) {
          // non-blocking
        }
      }
    } catch (error) {
      console.error('[revision][create][error]', { assetId, error });
    }
  } catch (error) {
    logUploadFailure('metadata-persistence', error, assetId, {
      clientId: asset.client_id,
      folderId: folder.id,
      driveFileId: input.uploadResult.driveFileId,
      driveFileUrl: input.uploadResult.driveFileUrl,
      mimeType: input.uploadResult.mimeType,
      fileSize: input.uploadResult.fileSize,
      activity: 'file_uploaded',
    });
  }

  try {
    await logAssetActivity({
      assetId,
      action: 'file_uploaded',
      metadata: {
        driveFileId: input.uploadResult.driveFileId,
        driveFileUrl: input.uploadResult.driveFileUrl,
        mimeType: input.uploadResult.mimeType,
        fileSize: input.uploadResult.fileSize,
        uploadStatus: input.uploadResult.uploadStatus,
        folderId: folder.id,
        folderUrl: folder.url,
      },
    });
  } catch (error) {
    logUploadFailure('metadata-persistence', error, assetId, {
      clientId: asset.client_id,
      folderId: folder.id,
      driveFileId: input.uploadResult.driveFileId,
      driveFileUrl: input.uploadResult.driveFileUrl,
      mimeType: input.uploadResult.mimeType,
      fileSize: input.uploadResult.fileSize,
      activity: 'file_uploaded',
    });
  }

  console.info('[upload][success]', {
    assetId,
    clientId: asset.client_id,
    driveFileId: input.uploadResult.driveFileId,
    driveFileUrl: input.uploadResult.driveFileUrl,
    mimeType: input.uploadResult.mimeType,
    fileSize: input.uploadResult.fileSize,
    uploadStatus: input.uploadResult.uploadStatus,
  });

  if (isRevisionUpload) {
    if (revisionNotificationVersion != null) {
      void sendRevisionUploadNotification({
        assetId,
        assetTitle: asset.title,
        revisionVersion: revisionNotificationVersion,
        uploadedBy: {
          email: user.email,
          name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        },
        uploadedAt,
      });
    }
  } else {
    void sendAssetUploadNotification({
      assetId,
      assetTitle: asset.title,
      clientName,
      assetType: asset.type,
      assetStatus: updates.status ?? asset.status,
      uploadedBy: {
        email: user.email,
        name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      },
      uploadedAt,
    });
  }

  return {
    asset: mapped,
    upload: {
      driveFileId: input.uploadResult.driveFileId,
      driveFileUrl: input.uploadResult.driveFileUrl,
      mimeType: input.uploadResult.mimeType,
      fileSize: input.uploadResult.fileSize,
      uploadStatus: input.uploadResult.uploadStatus,
    },
  };
}

export async function uploadAssetFile(assetId: string, file: File): Promise<AssetUploadResult> {
  const supabase = await createServerSupabaseClient();
  const [userResult, sessionResult] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);
  const {
    data: { user },
    error,
  } = userResult;

  console.info(
    '[upload][auth] ' +
      JSON.stringify({
        assetId,
        authSource: 'service-cookie-store',
        userExists: Boolean(user),
        sessionExists: Boolean(sessionResult.data.session),
        cookiesPresent: 'unknown',
      })
  );

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  await getOrCreateCurrentUserProfile();

  const asset = await getAssetById(assetId, supabase);
  if (!asset) {
    throw new Error('Asset not found');
  }

  let clientName = asset.client_id;
  try {
    const client = await getClientById(asset.client_id, supabase);
    clientName = client?.name ?? clientName;
  } catch (_error) {
    // Non-blocking: email can fall back to the client id.
  }

  const isRevisionUpload = Boolean(asset.drive_file_id || asset.uploaded_at || (asset.revision_count ?? 0) > 0);
  let revisionNotificationVersion: number | null = null;

  if (!isRevisionUpload) {
    await transitionAssetStatus(assetId, supabase, 'uploading', 'upload-start');
  }

  console.info('[upload][asset-check]', {
    assetId,
    clientId: asset.client_id,
    assetType: asset.type,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSize: file.size,
  });

  try {
    let folder;
    try {
      folder = await resolveAssetDriveFolder(asset.type, asset.client_id);
    } catch (error) {
      logUploadFailure('folder-resolution', error, assetId, {
        clientId: asset.client_id,
        assetType: asset.type,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
      });
      throw error;
    }

    if (!folder) {
      const error = new Error('Drive folder not found for asset');
      logUploadFailure('folder-resolution', error, assetId, {
        clientId: asset.client_id,
        assetType: asset.type,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
      });
      throw error;
    }

    console.info('[upload][folder-resolved]', {
      assetId,
      clientId: asset.client_id,
      assetType: asset.type,
      folderId: folder.id,
      folderUrl: folder.url,
    });

    console.info('[upload][drive-upload]', {
      assetId,
      clientId: asset.client_id,
      folderId: folder.id,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
      uploadPayloadSize: file.size,
    });

    const uploadResult: DriveUploadResult = await uploadFileToFolder({
      folderId: folder.id,
      fileName: file.name || asset.title,
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
      file,
    });

    const uploadedAt = new Date().toISOString();
    const fileExtension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? null : null;

    const updates: Parameters<typeof updateAssetRow>[1] = {
      drive_file_id: uploadResult.driveFileId,
      drive_file_url: uploadResult.driveFileUrl,
      thumbnail_url: uploadResult.thumbnailLink ?? asset.thumbnail_url ?? null,
      mime_type: uploadResult.mimeType,
      file_size: uploadResult.fileSize,
      file_extension: fileExtension,
      uploaded_at: uploadedAt,
      uploaded_by: user.id,
    };

    if (!isRevisionUpload) {
      logAssetStatusTransition(assetId, 'uploading', 'uploaded', 'upload-success');
      updates.status = 'uploaded';
    } else {
      console.info('[asset][revision-upload]', {
        assetId,
        statusPreserved: asset.status,
      });
    }

    const updated = await updateAssetRow(assetId, updates, supabase);
    const persisted = await getAssetById(assetId, supabase);
    let mapped = mapAsset(persisted ?? updated);

    if (!mapped) {
      throw new Error('Failed to map asset');
    }

    try {
      const metadata = await extractAssetMetadata({
        assetId,
        file,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        driveFileId: uploadResult.driveFileId,
        driveFileUrl: uploadResult.driveFileUrl,
        thumbnailUrl: uploadResult.thumbnailLink ?? asset.thumbnail_url ?? null,
        uploadedBy: user.id,
        uploadedAt,
      });

      await updateAssetRow(assetId, metadata.updates, supabase);
      const refreshed = await getAssetById(assetId, supabase);
      const refreshedMapped = mapAsset(refreshed);
      if (refreshedMapped) {
        mapped = refreshedMapped;
      }
      // Create an immutable revision record for this upload and update the asset's revision pointers
      try {
        const persistedAfterUpdate = await getAssetById(assetId, supabase);
        const currentCount = persistedAfterUpdate?.revision_count ?? 0;
        const versionNumber = (currentCount ?? 0) + 1;

        const revisionInsert = {
          asset_id: assetId,
          version_number: versionNumber,
          uploaded_by: user.id,
          uploaded_at: uploadedAt,
          drive_file_id: uploadResult.driveFileId,
          drive_file_url: uploadResult.driveFileUrl,
          file_size: uploadResult.fileSize,
          mime_type: uploadResult.mimeType,
          media_width: metadata.extractedFields.mediaWidth ?? null,
          media_height: metadata.extractedFields.mediaHeight ?? null,
          duration_seconds: metadata.extractedFields.durationSeconds ?? null,
          change_note: null,
          metadata: metadata.extractedFields,
        } as const;

        const { data: revisionData, error: revisionError } = await supabase.from('asset_revisions').insert(revisionInsert).select('*').single();
        if (revisionError) {
          console.error('[revision][create][failed]', { assetId, error: revisionError });
        } else if (revisionData) {
          revisionNotificationVersion = versionNumber;

          // update asset pointers to reference this new revision
          await updateAssetRow(
            assetId,
            {
              latest_revision_id: revisionData.id,
              current_revision_id: revisionData.id,
              revision_count: versionNumber,
            },
            supabase
          );

          try {
            await logAssetActivity({
              assetId,
              action: 'revision_created',
              metadata: {
                assetId,
                revisionId: revisionData.id,
                revisionNumber: versionNumber,
                driveFileId: uploadResult.driveFileId,
              },
            });
          } catch (_err) {
            // non-blocking
          }
        }
      } catch (error) {
        console.error('[revision][create][error]', { assetId, error });
      }
    } catch (error) {
      logUploadFailure('metadata-extraction', error, assetId, {
        clientId: asset.client_id,
        mediaType: file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'other',
        triggerSource: 'post-upload-enrichment',
      });
    }

    try {
      await logAssetActivity({
        assetId,
        action: 'file_uploaded',
        metadata: {
          driveFileId: uploadResult.driveFileId,
          driveFileUrl: uploadResult.driveFileUrl,
          mimeType: uploadResult.mimeType,
          fileSize: uploadResult.fileSize,
          uploadStatus: uploadResult.uploadStatus,
          folderId: folder.id,
          folderUrl: folder.url,
        },
      });
    } catch (error) {
      logUploadFailure('metadata-persistence', error, assetId, {
        clientId: asset.client_id,
        folderId: folder.id,
        driveFileId: uploadResult.driveFileId,
        driveFileUrl: uploadResult.driveFileUrl,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        activity: 'file_uploaded',
      });
    }

    console.info('[upload][success]', {
      assetId,
      clientId: asset.client_id,
      driveFileId: uploadResult.driveFileId,
      driveFileUrl: uploadResult.driveFileUrl,
      mimeType: uploadResult.mimeType,
      fileSize: uploadResult.fileSize,
      uploadStatus: uploadResult.uploadStatus,
    });

    if (isRevisionUpload) {
      if (revisionNotificationVersion != null) {
        void sendRevisionUploadNotification({
          assetId,
          assetTitle: asset.title,
          revisionVersion: revisionNotificationVersion,
          uploadedBy: {
            email: user.email,
            name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
          },
          uploadedAt,
        });
      }
    } else {
      void sendAssetUploadNotification({
        assetId,
        assetTitle: asset.title,
        clientName,
        assetType: asset.type,
        assetStatus: updates.status ?? asset.status,
        uploadedBy: {
          email: user.email,
          name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        },
        uploadedAt,
      });
    }

    return {
      asset: mapped,
      upload: {
        driveFileId: uploadResult.driveFileId,
        driveFileUrl: uploadResult.driveFileUrl,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        uploadStatus: uploadResult.uploadStatus,
      },
    };
  } catch (error) {
    try {
      const currentAsset = await getAssetById(assetId, supabase);
      if (!isRevisionUpload && currentAsset && currentAsset.status !== 'failed' && canTransitionStatus(currentAsset.status, 'failed')) {
        logAssetStatusTransition(assetId, currentAsset.status, 'failed', 'upload-failure');
        await updateAssetRow(assetId, { status: 'failed' }, supabase);
      }
    } catch (rollbackError) {
      logUploadFailure('status-transition', rollbackError, assetId, {
        triggerSource: 'upload-failure',
      });
    }

    logUploadFailure('upload-failure', error, assetId, {
      clientId: asset.client_id,
      triggerSource: 'upload-failure',
    });
    throw error;
  }
}

export async function updateAsset(
  assetId: string,
  input: Partial<AssetInput>
): Promise<Asset> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  if (input.scheduledAt !== undefined) {
    const scheduledFields = splitScheduledAt(input.scheduledAt);
    updates.scheduled_at = input.scheduledAt;
    updates.publish_date = scheduledFields.publishDate;
    updates.publish_time = scheduledFields.publishTime;
    updates.scheduled_by = input.scheduledBy ?? user?.id ?? existing.scheduled_by ?? null;
  }
  if (input.publishDate !== undefined) updates.publish_date = input.publishDate;
  if (input.publishTime !== undefined) updates.publish_time = input.publishTime;
  if (input.scheduledBy !== undefined) updates.scheduled_by = input.scheduledBy;
  if (input.publishedAt !== undefined) updates.published_at = input.publishedAt;
  if (input.approvedAt !== undefined) updates.approved_at = input.approvedAt;
  if (input.approvedBy !== undefined) updates.approved_by = input.approvedBy;

  if (input.status === 'approved') {
    updates.approved_at = input.approvedAt ?? new Date().toISOString();
    updates.approved_by = input.approvedBy ?? user?.id ?? existing.approved_by ?? null;
  }

  if (input.status === 'published') {
    updates.published_at = input.publishedAt ?? new Date().toISOString();
  }

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
    logAssetStatusTransition(assetId, existing.status, input.status, 'api-update');
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

const approvalEligibleStatuses = new Set<AssetStatus>(['draft', 'ready_for_review']);

export async function approveAsset(assetId: string, userId: string): Promise<Asset> {
  const supabase = await createServerSupabaseClient();
  const existing = await getAssetById(assetId, supabase);
  if (!existing) {
    throw new Error('Asset not found');
  }

  if (existing.status === 'approved') {
    const mapped = mapAsset(existing);
    if (!mapped) {
      throw new Error('Failed to map asset');
    }
    return mapped;
  }

  if (!approvalEligibleStatuses.has(existing.status)) {
    throw new Error('Asset is not eligible for approval');
  }

  const approvedAt = new Date().toISOString();
  const updated = await updateAssetRow(
    assetId,
    {
      status: 'approved',
      approved_at: approvedAt,
      approved_by: userId,
    },
    supabase
  );

  const mapped = mapAsset(updated);
  if (!mapped) {
    throw new Error('Failed to map asset');
  }

  return mapped;
}

export async function rejectAsset(assetId: string, userId: string): Promise<Asset> {
  const supabase = await createServerSupabaseClient();
  const existing = await getAssetById(assetId, supabase);
  if (!existing) {
    throw new Error('Asset not found');
  }

  if (existing.status === 'revision_requested') {
    const mapped = mapAsset(existing);
    if (!mapped) {
      throw new Error('Failed to map asset');
    }
    return mapped;
  }

  if (!approvalEligibleStatuses.has(existing.status)) {
    throw new Error('Asset is not eligible for rejection');
  }

  const updated = await updateAssetRow(
    assetId,
    {
      status: 'revision_requested',
      approved_at: null,
      approved_by: null,
    },
    supabase
  );

  const mapped = mapAsset(updated);
  if (!mapped) {
    throw new Error('Failed to map asset');
  }

  return mapped;
}

export async function removeAsset(assetId: string): Promise<void> {
  await deleteAssetRow(assetId);
}
