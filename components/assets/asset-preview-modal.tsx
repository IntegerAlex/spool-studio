"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Download, ExternalLink, FileAudio, FileText, Image as ImageIcon, PlayCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getAssetPreviewType, type AssetPreviewType } from '@/lib/asset-display';
import {
  getAssetPreviewUrls,
  type AssetPreviewDescriptor,
} from '@/lib/asset-preview';

interface AssetPreviewMediaProps {
  item: AssetPreviewDescriptor;
  className?: string;
  compact?: boolean;
}

function PreviewFallback({ previewType }: { previewType: AssetPreviewType }) {
  const iconClassName = 'h-10 w-10 text-muted-foreground';

  if (previewType === 'image') {
    return <ImageIcon className={iconClassName} />;
  }

  if (previewType === 'video') {
    return <PlayCircle className={iconClassName} />;
  }

  if (previewType === 'audio') {
    return <FileAudio className={iconClassName} />;
  }

  return <FileText className={iconClassName} />;
}

export function AssetPreviewMedia({ item, className, compact = false }: AssetPreviewMediaProps) {
  const previewType = getAssetPreviewType(item);
  const urls = getAssetPreviewUrls(item);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mediaErrored, setMediaErrored] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setMediaErrored(false);
  }, [item.driveFileId, item.driveFileUrl, item.thumbnailUrl, item.mimeType, item.fileExtension]);

  const containerClassName = compact
    ? 'min-h-[220px]'
    : 'min-h-[420px]';

  const mediaNode = useMemo(() => {
    if (mediaErrored) {
      return null;
    }

    if (previewType === 'image') {
      const imageUrl = item.thumbnailUrl ?? urls.viewUrl ?? urls.openUrl;
      if (!imageUrl) {
        return null;
      }

      return (
        <div className="relative flex items-center justify-center bg-muted/30" style={{ minHeight: compact ? 220 : 420 }}>
          {!imageLoaded ? <div className="absolute inset-0 animate-pulse bg-muted/60" /> : null}
          <Image
            src={imageUrl}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 100vw, 80vw"
            className={cn('object-contain transition-opacity duration-300', imageLoaded ? 'opacity-100' : 'opacity-0')}
            onLoad={() => setImageLoaded(true)}
            onError={() => setMediaErrored(true)}
            unoptimized
            priority={false}
          />
        </div>
      );
    }

    if (previewType === 'video') {
      const videoUrl = urls.previewUrl ?? urls.directMediaUrl ?? urls.openUrl;
      if (!videoUrl) {
        return null;
      }

      // suppressed noisy preview logs to reduce client-side render work

      return (
        <video
          controls
          playsInline
          preload="metadata"
          className="h-full w-full rounded-lg bg-black"
          onError={() => setMediaErrored(true)}
        >
          <source src={videoUrl} type={item.mimeType ?? 'video/mp4'} />
        </video>
      );
    }

    if (previewType === 'audio') {
      const audioUrl = urls.directMediaUrl ?? urls.openUrl;
      if (!audioUrl) {
        return null;
      }

      return (
        <div className="flex h-full items-center justify-center rounded-xl border border-border/60 bg-muted/25 p-6">
          <div className="w-full max-w-md space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-background shadow-sm">
              <FileAudio className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Audio preview</p>
              <p className="text-xs text-muted-foreground">Use the built-in player below to listen without leaving the CMS.</p>
            </div>
            <audio controls preload="metadata" className="w-full" src={audioUrl} onError={() => setMediaErrored(true)} />
          </div>
        </div>
      );
    }

    if (previewType === 'document') {
      const documentUrl = urls.previewUrl ?? urls.openUrl;
      if (!documentUrl) {
        return null;
      }

      return (
        <iframe
          title={item.title}
          src={documentUrl}
          className="h-full w-full rounded-xl border border-border/60 bg-background"
        />
      );
    }

    return null;
  }, [imageLoaded, item, mediaErrored, previewType, urls.directMediaUrl, urls.openUrl, urls.previewUrl, urls.viewUrl]);

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-border/60 bg-muted/20', containerClassName, className)}>
      {mediaNode ? (
        mediaNode
      ) : (
        <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 p-6 text-center">
          <PreviewFallback previewType={previewType} />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Preview unavailable</p>
            <p className="max-w-md text-xs text-muted-foreground">
              {previewType === 'file'
                ? 'This file type cannot be rendered inline, but the original file is still available.'
                : 'The CMS could not load a preview for this asset. Try opening the file directly.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {urls.openUrl ? (
              <Button asChild size="sm" variant="secondary">
                <a href={urls.openUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open File
                </a>
              </Button>
            ) : null}
            {urls.downloadUrl ? (
              <Button asChild size="sm" variant="outline">
                <a href={urls.downloadUrl} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

interface AssetPreviewModalProps {
  item: AssetPreviewDescriptor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description?: string;
}

export function AssetPreviewModal({ item, open, onOpenChange, description }: AssetPreviewModalProps) {
  const previewType = item ? getAssetPreviewType(item) : 'file';
  const urls = item ? getAssetPreviewUrls(item) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-[1180px] overflow-hidden border-border/60 p-0 sm:rounded-2xl">
        <div className="flex max-h-[92vh] min-h-0 flex-col">
          <DialogHeader className="border-b border-border/60 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <DialogTitle className="text-lg">{item?.title ?? 'Preview'}</DialogTitle>
                <DialogDescription>{description ?? 'Preview the uploaded asset without leaving the CMS.'}</DialogDescription>
              </div>
              <Badge variant="secondary" className="capitalize">
                {previewType}
              </Badge>
            </div>
          </DialogHeader>

          <div className="grid flex-1 min-h-0 gap-4 overflow-hidden p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <AssetPreviewMedia item={item ?? { title: 'Preview' }} compact={false} className="aspect-video min-h-0 w-full" />

            <div className="min-w-0 space-y-4 rounded-2xl border border-border/60 bg-background/70 p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Playback details</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <span>Type</span>
                    <span className="font-medium text-foreground capitalize">{previewType}</span>
                  </div>
                  {item?.mimeType ? (
                    <div className="flex items-center justify-between gap-3">
                      <span>MIME type</span>
                      <span className="max-w-[180px] truncate font-medium text-foreground">{item.mimeType}</span>
                    </div>
                  ) : null}
                  {item?.fileSize != null ? (
                    <div className="flex items-center justify-between gap-3">
                      <span>File size</span>
                      <span className="font-medium text-foreground">{(item.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>
                  ) : null}
                  {item?.durationSeconds != null ? (
                    <div className="flex items-center justify-between gap-3">
                      <span>Duration</span>
                      <span className="font-medium text-foreground">{Math.max(1, Math.round(item.durationSeconds))}s</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Actions</p>
                <div className="flex flex-col gap-2">
                  {urls?.openUrl ? (
                    <Button asChild variant="secondary" className="justify-start">
                      <a href={urls.openUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open file
                      </a>
                    </Button>
                  ) : null}
                  {urls?.downloadUrl ? (
                    <Button asChild variant="outline" className="justify-start">
                      <a href={urls.downloadUrl} target="_blank" rel="noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
