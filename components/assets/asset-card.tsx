'use client';

import { Asset } from '@/types/index';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { FileText, MessageCircle } from 'lucide-react';
import { StatusBadge } from '@/components/assets/status-badge';

interface AssetCardProps {
  asset: Asset;
}

export function AssetCard({ asset }: AssetCardProps) {
  return (
    <Link href={`/dashboard/assets/${asset.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all border border-border cursor-pointer h-full flex flex-col">
        <div className="bg-muted h-32 flex items-center justify-center border-b border-border">
          <FileText className="w-8 h-8 text-muted-foreground" />
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
