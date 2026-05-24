import type { Asset, AssetRevision } from '@/types/index';
import { getAssetPreviewType } from '@/lib/asset-display';

export interface AssetPreviewDescriptor {
  title: string;
  mimeType?: string | null;
  fileExtension?: string | null;
  driveFileId?: string | null;
  driveFileUrl?: string | null;
  thumbnailUrl?: string | null;
  fileSize?: number | null;
  durationSeconds?: number | null;
}

export interface AssetPreviewUrls {
  openUrl: string | null;
  previewUrl: string | null;
  viewUrl: string | null;
  downloadUrl: string | null;
  directMediaUrl: string | null;
}

export function extractGoogleDriveFileId(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const urlPatterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)\//,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/,
  ];

  for (const pattern of urlPatterns) {
    const match = value.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function resolveDriveFileId(input: Pick<AssetPreviewDescriptor, 'driveFileId' | 'driveFileUrl'>): string | null {
  return input.driveFileId ?? extractGoogleDriveFileId(input.driveFileUrl);
}

export function getGoogleDrivePreviewUrl(input: Pick<AssetPreviewDescriptor, 'driveFileId' | 'driveFileUrl'>): string | null {
  const driveFileId = resolveDriveFileId(input);
  if (!driveFileId) {
    return input.driveFileUrl ?? null;
  }

  return `https://drive.google.com/file/d/${driveFileId}/preview`;
}

export function getGoogleDriveViewUrl(input: Pick<AssetPreviewDescriptor, 'driveFileId' | 'driveFileUrl'>): string | null {
  const driveFileId = resolveDriveFileId(input);
  if (!driveFileId) {
    return input.driveFileUrl ?? null;
  }

  return `https://drive.google.com/uc?export=view&id=${driveFileId}`;
}

export function getGoogleDriveDownloadUrl(input: Pick<AssetPreviewDescriptor, 'driveFileId' | 'driveFileUrl'>): string | null {
  const driveFileId = resolveDriveFileId(input);
  if (!driveFileId) {
    return input.driveFileUrl ?? null;
  }

  return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
}

export function getAssetPreviewUrls(input: AssetPreviewDescriptor): AssetPreviewUrls {
  const previewType = getAssetPreviewType(input);
  const openUrl = input.driveFileUrl ?? getGoogleDrivePreviewUrl(input);
  const viewUrl = getGoogleDriveViewUrl(input);
  const downloadUrl = getGoogleDriveDownloadUrl(input);
  const previewUrl = previewType === 'video' ? downloadUrl ?? openUrl : getGoogleDrivePreviewUrl(input);

  return {
    openUrl,
    previewUrl,
    viewUrl,
    downloadUrl,
    directMediaUrl:
      previewType === 'image'
        ? input.thumbnailUrl ?? viewUrl ?? openUrl
        : previewType === 'video' || previewType === 'audio'
          ? downloadUrl ?? openUrl
          : previewType === 'document'
            ? previewUrl ?? openUrl
            : openUrl,
  };
}

export function toAssetPreviewDescriptor(
  item: Pick<Asset, 'title' | 'mimeType' | 'fileExtension' | 'driveFileId' | 'driveFileUrl' | 'thumbnailUrl' | 'fileSize' | 'durationSeconds'> | Pick<AssetRevision, 'mimeType' | 'driveFileId' | 'driveFileUrl' | 'fileSize' | 'durationSeconds'> & { title: string; fileExtension?: string | null; thumbnailUrl?: string | null }
): AssetPreviewDescriptor {
  return {
    title: item.title,
    mimeType: item.mimeType ?? null,
    fileExtension: 'fileExtension' in item ? item.fileExtension ?? null : null,
    driveFileId: item.driveFileId ?? null,
    driveFileUrl: item.driveFileUrl ?? null,
    thumbnailUrl: 'thumbnailUrl' in item ? item.thumbnailUrl ?? null : null,
    fileSize: item.fileSize ?? null,
    durationSeconds: item.durationSeconds ?? null,
  };
}