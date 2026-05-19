'use client';

import { Asset, AssetStatus } from '@/types/index';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { GripVertical } from 'lucide-react';

interface KanbanBoardProps {
  assets: Asset[];
  onStatusChange?: (assetId: string, newStatus: AssetStatus) => void;
}

const statuses: { id: AssetStatus; label: string; color: string }[] = [
  { id: 'draft', label: 'Draft', color: 'bg-gray-100 dark:bg-gray-900/30' },
  { id: 'in_design', label: 'In Design', color: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'ready_for_review', label: 'Ready for Review', color: 'bg-purple-100 dark:bg-purple-900/30' },
  { id: 'revision_requested', label: 'Revision Requested', color: 'bg-orange-100 dark:bg-orange-900/30' },
  { id: 'approved', label: 'Approved', color: 'bg-green-100 dark:bg-green-900/30' },
  { id: 'scheduled', label: 'Scheduled', color: 'bg-indigo-100 dark:bg-indigo-900/30' },
  { id: 'uploaded', label: 'Uploaded', color: 'bg-teal-100 dark:bg-teal-900/30' },
  { id: 'archived', label: 'Archived', color: 'bg-neutral-100 dark:bg-neutral-900/30' },
];

function KanbanCard({ asset }: { asset: Asset }) {
  return (
    <Link href={`/dashboard/assets/${asset.id}`}>
      <Card className="p-4 border border-border hover:shadow-md transition-all cursor-pointer bg-card hover:border-primary/50">
        <h4 className="font-semibold text-foreground text-sm mb-2 line-clamp-2">{asset.title}</h4>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{asset.type}</span>
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            {asset.comments.length > 0 && <span>💬 {asset.comments.length}</span>}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function KanbanBoard({ assets }: KanbanBoardProps) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-min">
        {statuses.map((status) => {
          const statusAssets = assets.filter((a) => a.status === status.id);

          return (
            <div key={status.id} className="w-80 flex-shrink-0">
              <div className={`p-4 rounded-lg ${status.color} min-h-screen`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">
                    {status.label}
                  </h3>
                  <span className="text-sm text-muted-foreground bg-background px-2 py-1 rounded">
                    {statusAssets.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {statusAssets.map((asset) => (
                    <KanbanCard key={asset.id} asset={asset} />
                  ))}
                </div>

                {statusAssets.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No assets
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
