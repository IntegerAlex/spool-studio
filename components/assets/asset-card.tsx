'use client';

import { Asset } from '@/types/index';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { FileText, MessageCircle, ExternalLink, Copy } from 'lucide-react';
import { StatusBadge } from '@/components/assets/status-badge';

interface AssetCardProps {
  asset: Asset;
}

export function AssetCard({ asset }: AssetCardProps) {
  return (
    <Link href={`/dashboard/assets/${asset.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all border border-border cursor-pointer h-full flex flex-col">
        <div className="relative h-32 flex items-center justify-center border-b border-border bg-muted">
          {asset.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.thumbnailUrl} alt={asset.title} className="object-cover w-full h-32" />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          )}

          <div className="absolute top-2 right-2 flex space-x-2">
            {asset.driveFileUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    window.open(asset.driveFileUrl ?? '', '_blank', 'noopener,noreferrer');
                  } catch (_) {
                    // ignore open errors
                  }
                }}
                title="Open in Drive"
                aria-label="Open in Drive"
                className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-card/80 border border-border text-muted-foreground hover:bg-muted"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            {asset.driveFileUrl && (
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    await navigator.clipboard.writeText(asset.driveFileUrl ?? '');
                  } catch (_) {
                    // ignore clipboard errors
                  }
                }}
                title="Copy link"
                className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-card/80 border border-border text-muted-foreground hover:bg-muted"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-2">{asset.title}</h3>

          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {asset.type}
              </span>
              <StatusBadge status={asset.status} />
            </div>

            <p className="text-xs text-muted-foreground">
              {new Date(asset.updatedAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-3 h-3" />
              <span>{asset.comments.length} comments</span>
            </div>
            <span>{asset.revisions.length} revisions</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
