import { FileText, Image as ImageIcon, Video, FileUp, FileAudio } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Asset } from '@/types/index';

export type AssetPreviewType = 'image' | 'video' | 'audio' | 'document' | 'file';

type AssetPreviewSignals = {
  mimeType?: string | null;
  fileExtension?: string | null;
  thumbnailUrl?: string | null;
};

export function getAssetPreviewType(asset: AssetPreviewSignals): AssetPreviewType {
  const mimeType = asset.mimeType?.toLowerCase() ?? '';
  const extension = asset.fileExtension?.toLowerCase() ?? '';

  if (mimeType.startsWith('image/') || Boolean(asset.thumbnailUrl && mimeType.startsWith('image/'))) {
    return 'image';
  }

  if (mimeType.startsWith('video/') || ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi'].includes(extension)) {
    return 'video';
  }

  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension)) {
    return 'audio';
  }

  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return 'document';
  }

  return 'file';
}

export function getAssetIcon(asset: AssetPreviewSignals): LucideIcon {
  const previewType = getAssetPreviewType(asset);

  if (previewType === 'image') {
    return ImageIcon;
  }

  if (previewType === 'video') {
    return Video;
  }

  if (previewType === 'audio') {
    return FileAudio;
  }

  if (previewType === 'document') {
    return FileUp;
  }

  return FileText;
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) {
    return 'Unknown time';
  }

  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();
  if (Number.isNaN(timestamp)) {
    return 'Unknown time';
  }

  const diffMs = Date.now() - timestamp;
  const absSeconds = Math.abs(Math.round(diffMs / 1000));

  if (absSeconds < 60) {
    return diffMs >= 0 ? 'Just now' : 'In moments';
  }

  const minutes = Math.round(absSeconds / 60);
  if (minutes < 60) {
    return diffMs >= 0 ? `${minutes}m ago` : `In ${minutes}m`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return diffMs >= 0 ? `${hours}h ago` : `In ${hours}h`;
  }

  const days = Math.round(hours / 24);
  if (days < 30) {
    return diffMs >= 0 ? `${days}d ago` : `In ${days}d`;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp));
}