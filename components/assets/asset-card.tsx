'use client';

import { useEffect } from 'react';
import { Asset } from '@/types/index';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import {
  Download,
  Eye,
  Pencil,
  Upload,
  FileText,
} from 'lucide-react';
import { StatusBadge } from '@/components/assets/status-badge';
import { getAssetIcon, getAssetPreviewType } from '@/lib/asset-display';
import { canUploadFromStatus } from '@/lib/asset-workflow';
import { cn } from '@/lib/utils';
import { AssetFormDialog } from '@/components/assets/asset-form-dialog';

interface AssetCardProps {
  asset: Asset;
}

function getDimensionLabel(asset: Asset): string | null {
  if (asset.mediaWidth && asset.mediaHeight) {
    return `${asset.mediaWidth} × ${asset.mediaHeight}`;
  }

  return null;
}

function getDurationLabel(asset: Asset): string | null {
  if (asset.durationSeconds == null) {
    return null;
  }

  const rounded = Math.max(1, Math.round(asset.durationSeconds));
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getExtensionLabel(asset: Asset): string {
  return (asset.fileExtension ?? asset.mimeType?.split('/').pop() ?? asset.type).toUpperCase();
}

export function AssetCard({ asset }: AssetCardProps) {
  const previewType = getAssetPreviewType(asset);
  const AssetIcon = getAssetIcon(asset);
  const durationLabel = getDurationLabel(asset);
  const detailUrl = `/dashboard/assets/${asset.id}`;
  const previewUrl = (previewType === 'image' && asset.thumbnailUrl) || asset.driveFileUrl || detailUrl;
  const uploadEligible = canUploadFromStatus(asset.status);

  useEffect(() => {
    console.info('[asset-card][render]', {
      assetId: asset.id,
      assetType: asset.type,
      previewStrategy: previewType,
      uploadEligible,
    });
  }, [asset.id, asset.type, asset.durationSeconds, previewType, uploadEligible]);

  const openAsset = () => {
    try {
      window.location.href = detailUrl;
    } catch (_) {
      // ignore open errors
    }
  };

  const previewAsset = () => {
    try {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    } catch (_) {
      // ignore open errors
    }
  };

  const copyDriveLink = async () => {
    return;
  };

  const downloadAsset = () => {
    const targetUrl = asset.driveFileUrl ?? asset.thumbnailUrl;
    if (!targetUrl) {
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.download = asset.title;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (_) {
      // ignore download errors
    }
  };

  return (
    <Link href={`/dashboard/assets/${asset.id}`}>
      <Card
        className={cn(
          'group overflow-hidden rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#161616] cursor-pointer h-full flex flex-col shadow-none transition-colors duration-150',
          'hover:border-[rgba(255,255,255,0.18)] hover:bg-[#1a1a1a] focus-within:border-[rgba(255,255,255,0.18)] focus-within:bg-[#1a1a1a]'
        )}
      >
        <div className="relative overflow-hidden bg-[#0f0f0f]">
          <div className="aspect-[16/9] w-full">
            {previewType === 'image' && asset.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset.thumbnailUrl}
                alt={asset.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#161616]">
                  <AssetIcon className="h-7 w-7 text-[#71717a]" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">{asset.title}</p>
                  <p className="text-xs text-[#71717a] capitalize">
                    {previewType === 'document' ? 'Document preview' : previewType === 'video' ? 'Video preview' : 'File preview'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                previewAsset();
              }}
              className="flex size-8 items-center justify-center rounded-full bg-black/70 text-white transition-transform duration-150 hover:scale-105"
              aria-label="Preview asset"
              title="Preview asset"
            >
              <Eye className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openAsset();
              }}
              className="flex size-8 items-center justify-center rounded-full bg-black/70 text-white transition-transform duration-150 hover:scale-105"
              aria-label="Edit asset"
              title="Edit asset"
            >
              <Pencil className="h-4 w-4" />
            </button>

            {uploadEligible && (
              <AssetFormDialog
                mode="edit"
                asset={asset}
                trigger={
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="flex size-8 items-center justify-center rounded-full bg-black/70 text-white transition-transform duration-150 hover:scale-105"
                    aria-label="Upload asset"
                    title="Upload asset"
                  >
                    <Upload className="h-4 w-4" />
                  </button>
                }
              />
            )}
          </div>

          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.6)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
              {getExtensionLabel(asset)}
            </span>
            {durationLabel && (
              <span className="rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-semibold text-white">
                {durationLabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 p-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium leading-5 text-white">{asset.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-[18px] items-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-2 text-[10px] uppercase tracking-wide text-[#a1a1aa]">
                {getExtensionLabel(asset)}
              </span>
              <StatusBadge status={asset.status} />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
