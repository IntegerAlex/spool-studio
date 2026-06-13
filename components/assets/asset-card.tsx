'use client';

import React, { useState, useCallback } from 'react';
import { Asset, User } from '@/types/index';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import {
  Download,
  Eye,
  Pencil,
  Upload,
  FileText,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { StatusBadge } from '@/components/assets/status-badge';
import { getAssetIcon, getAssetPreviewType } from '@/lib/asset-display';
import { canUploadFromStatus } from '@/lib/asset-workflow';
import { cn } from '@/lib/utils';
import { AssetFormDialog } from '@/components/assets/asset-form-dialog';
import { authApi, assetsApi, clearApiClientCache } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { mutate } from 'swr';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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

function AssetCardImpl({ asset }: AssetCardProps) {
  const router = useRouter();
  const previewType = getAssetPreviewType(asset);
  const AssetIcon = getAssetIcon(asset);
  const durationLabel = getDurationLabel(asset);
  const detailUrl = `/dashboard/assets/${asset.id}`;
  const uploadEligible = canUploadFromStatus(asset.status);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  // Removed per-card current user fetch and debug logging to avoid per-card async work and noisy renders

  const openAsset = () => {
    try {
      window.location.href = detailUrl;
    } catch (_) {
      // ignore open errors
    }
  };

  const previewAsset = () => {
    try {
      window.open(detailUrl, '_blank', 'noopener,noreferrer');
    } catch (_) {
      // ignore open errors
    }
  };

  const handlePreview = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    previewAsset();
  }, [asset.id]);

  const handleOpen = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openAsset();
  }, [asset.id]);

  const copyDriveLink = async () => {
    try {
      const shareUrl = asset.driveFileUrl ?? `${window.location.origin}/dashboard/assets/${asset.id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link copied' });
    } catch {
      toast({ title: 'Failed to copy link', variant: 'destructive' });
    }
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
                    {previewType === 'document'
                      ? 'Document preview'
                      : previewType === 'video'
                        ? 'Video preview'
                        : previewType === 'audio'
                          ? 'Audio preview'
                          : 'File preview'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              onClick={handlePreview}
              className="flex size-8 items-center justify-center rounded-full bg-black/70 text-white transition-transform duration-150 hover:scale-105"
              aria-label="Preview asset"
              title="Preview asset"
            >
              <Eye className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleOpen}
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

        <div className="flex items-start justify-between gap-2 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium leading-5 text-white">{asset.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-[18px] items-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-2 text-[10px] uppercase tracking-wide text-[#a1a1aa]">
                {getExtensionLabel(asset)}
              </span>
              <StatusBadge status={asset.status} />
            </div>
          </div>

          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="shrink-0"
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded-md border border-[rgba(255,255,255,0.08)] bg-transparent text-white hover:bg-[rgba(255,255,255,0.06)]"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-[rgba(255,255,255,0.08)] bg-[#161616] text-white w-36">
                <DropdownMenuItem
                  onClick={() => openAsset()}
                  className="cursor-pointer text-white focus:bg-[rgba(255,255,255,0.06)] focus:text-white"
                >
                  Open
                </DropdownMenuItem>
                <AssetFormDialog
                  mode="edit"
                  asset={asset}
                  trigger={
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="cursor-pointer text-white focus:bg-[rgba(255,255,255,0.06)] focus:text-white"
                    >
                      Edit
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuItem
                  onClick={() => copyDriveLink()}
                  className="cursor-pointer text-white focus:bg-[rgba(255,255,255,0.06)] focus:text-white"
                >
                  Copy Link
                </DropdownMenuItem>
                {true && (
                  <>
                    <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.08)]" />
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="cursor-pointer text-red-300 focus:bg-red-500/10 focus:text-red-200"
                    >
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="w-[95vw] max-w-md bg-[#161616] text-white border-[rgba(255,255,255,0.08)]"
        >
          <DialogHeader>
            <DialogTitle className="text-white text-[16px] font-medium">Delete Asset?</DialogTitle>
            <DialogDescription className="text-[#a1a1aa] mt-2 text-[13px] leading-relaxed">
              This will permanently remove:
              <span className="block mt-2 pl-3 list-item">revisions</span>
              <span className="block pl-3 list-item">comments</span>
              <span className="block pl-3 list-item">activity history</span>
              <span className="block pl-3 list-item">calendar sync metadata</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-[rgba(255,255,255,0.1)] bg-transparent text-white hover:bg-[rgba(255,255,255,0.06)]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isDeleting}
              onClick={async () => {
                try {
                  setIsDeleting(true);
                  await assetsApi.delete(asset.id);
                  toast({ title: 'Asset deleted successfully' });
                  setShowDeleteDialog(false);
                  mutate('/api/assets');
                  clearApiClientCache();
                  router.refresh();
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Failed to delete asset';
                  toast({
                    title: 'Delete failed',
                    description: message,
                    variant: 'destructive',
                  });
                } finally {
                  setIsDeleting(false);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Link>
  );
}

export const AssetCard = React.memo(AssetCardImpl);
