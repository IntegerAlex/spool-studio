'use client';

import { useState, useCallback, useMemo } from 'react';
import { Asset, AssetStatus } from '@/types/index';
import { canTransitionStatus } from '@/lib/asset-workflow';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  MoreHorizontal,
  Copy,
  Eye,
} from 'lucide-react';

interface KanbanBoardProps {
  assets: Asset[];
  onStatusChange?: (assetId: string, newStatus: AssetStatus) => void;
}

const statuses: { id: AssetStatus; label: string; color: string; bgLight: string; bgDark: string }[] = [
  { id: 'draft', label: 'Draft', color: 'text-gray-700', bgLight: 'bg-gray-50', bgDark: 'dark:bg-gray-900' },
  { id: 'in_design', label: 'In Design', color: 'text-blue-700', bgLight: 'bg-blue-50', bgDark: 'dark:bg-blue-950' },
  { id: 'ready_for_review', label: 'Ready for Review', color: 'text-purple-700', bgLight: 'bg-purple-50', bgDark: 'dark:bg-purple-950' },
  { id: 'revision_requested', label: 'Revision Requested', color: 'text-orange-700', bgLight: 'bg-orange-50', bgDark: 'dark:bg-orange-950' },
  { id: 'approved', label: 'Approved', color: 'text-green-700', bgLight: 'bg-green-50', bgDark: 'dark:bg-green-950' },
  { id: 'scheduled', label: 'Scheduled', color: 'text-indigo-700', bgLight: 'bg-indigo-50', bgDark: 'dark:bg-indigo-950' },
  { id: 'uploaded', label: 'Uploaded', color: 'text-teal-700', bgLight: 'bg-teal-50', bgDark: 'dark:bg-teal-950' },
  { id: 'archived', label: 'Archived', color: 'text-neutral-700', bgLight: 'bg-neutral-50', bgDark: 'dark:bg-neutral-900' },
];

function isOverdue(asset: Asset): boolean {
  if (asset.status === 'uploaded' || asset.status === 'archived' || asset.status === 'approved') return false;
  const daysSinceCreation = Math.floor((Date.now() - asset.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceCreation > 7;
}

function KanbanCard({ asset, onQuickApprove }: { asset: Asset; onQuickApprove?: () => void }) {
  const [showActions, setShowActions] = useState(false);
  const revisionCount = asset.revisions.length;
  const commentCount = asset.comments.length;
  const overdue = isOverdue(asset);
  const typeIcons: Record<string, string> = {
    reel: '📹',
    poster: '📄',
    carousel: '🎡',
    story: '📖',
  };

  return (
    <Card className={`group p-3 border transition-all cursor-pointer bg-card hover:shadow-md hover:border-primary/50 relative ${overdue ? 'border-orange-400 dark:border-orange-600' : 'border-border'}`}>
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />

        <Link href={`/dashboard/assets/${asset.id}`} className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1 mb-1">
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-foreground text-xs line-clamp-2 leading-tight">{asset.title}</h4>
              <span className="text-xs text-muted-foreground">{typeIcons[asset.type] || '📦'}</span>
            </div>
            {overdue && <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />}
          </div>
        </Link>

        <button
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          aria-label="Quick actions"
        >
          <MoreHorizontal className="w-4 h-4 text-muted-foreground hover:text-foreground" />
        </button>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1 mt-2 flex-wrap">
        {revisionCount > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
            <Clock className="w-3 h-3" />
            {revisionCount}
          </span>
        )}
        {commentCount > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium">
            <MessageSquare className="w-3 h-3" />
            {commentCount}
          </span>
        )}
        {asset.status === 'approved' && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* Quick Actions Tooltip */}
      {showActions && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border border-border rounded-md shadow-lg p-1 text-xs space-y-0.5 pointer-events-auto">
          <button className="w-full text-left px-2 py-1 hover:bg-muted rounded transition-colors flex items-center gap-2 text-foreground text-xs">
            <Eye className="w-3 h-3" />
            View
          </button>
          {asset.status === 'ready_for_review' && (
            <button onClick={onQuickApprove} className="w-full text-left px-2 py-1 hover:bg-muted rounded transition-colors flex items-center gap-2 text-green-600 dark:text-green-400 text-xs">
              <CheckCircle2 className="w-3 h-3" />
              Approve
            </button>
          )}
          <button className="w-full text-left px-2 py-1 hover:bg-muted rounded transition-colors flex items-center gap-2 text-foreground text-xs">
            <Copy className="w-3 h-3" />
            Copy link
          </button>
        </div>
      )}
    </Card>
  );
}

export function KanbanBoard({ assets, onStatusChange }: KanbanBoardProps) {
  const [collapsedColumns, setCollapsedColumns] = useState<Set<AssetStatus>>(new Set());
  const [draggedItem, setDraggedItem] = useState<{ assetId: string; fromStatus: AssetStatus } | null>(null);

  const toggleColumnCollapse = useCallback((statusId: AssetStatus) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(statusId)) {
        next.delete(statusId);
      } else {
        next.add(statusId);
      }
      return next;
    });
  }, []);

  const handleDragStart = (assetId: string, status: AssetStatus) => {
    setDraggedItem({ assetId, fromStatus: status });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('ring-2', 'ring-primary');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-2', 'ring-primary');
  };

  const handleDrop = (e: React.DragEvent, toStatus: AssetStatus) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-primary');
    if (!draggedItem || draggedItem.fromStatus === toStatus) {
      return;
    }
    if (!canTransitionStatus(draggedItem.fromStatus, toStatus)) {
      setDraggedItem(null);
      return;
    }
    setDraggedItem(null);
    onStatusChange?.(draggedItem.assetId, toStatus);
  };

  const assetsByStatus = useMemo(() => {
    const map = new Map<AssetStatus, Asset[]>();
    statuses.forEach((status) => {
      map.set(status.id, assets.filter((a) => a.status === status.id));
    });
    return map;
  }, [assets]);

  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
      <div className="flex gap-3 min-w-min">
        {statuses.map((status) => {
          const statusAssets = assetsByStatus.get(status.id) || [];
          const isCollapsed = collapsedColumns.has(status.id);

          return (
            <div
              key={status.id}
              className="flex flex-col w-72 lg:w-80 flex-shrink-0 h-[calc(100vh-200px)] max-h-[600px] lg:max-h-none"
            >
              {/* Column Header */}
              <div className={`${status.bgLight} ${status.bgDark} rounded-t-lg p-3 border border-border border-b-0 sticky top-0 z-10 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleColumnCollapse(status.id)}
                    className="p-0.5 hover:bg-muted rounded transition-colors"
                    aria-label={isCollapsed ? 'Expand column' : 'Collapse column'}
                  >
                    {isCollapsed ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <h3 className={`font-semibold text-sm ${status.color}`}>{status.label}</h3>
                </div>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-background text-xs font-semibold text-muted-foreground">
                  {statusAssets.length}
                </span>
              </div>

              {/* Column Content */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status.id)}
                className={`${status.bgLight} ${status.bgDark} rounded-b-lg border border-t-0 border-border flex-1 overflow-y-auto p-3 space-y-2 transition-all ${draggedItem ? 'bg-opacity-50' : ''}`}
              >
                {isCollapsed ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    {statusAssets.length} items
                  </div>
                ) : statusAssets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-xs">
                    <div className="text-2xl mb-2">⚡</div>
                    <p>No assets</p>
                  </div>
                ) : (
                  statusAssets.map((asset) => (
                    <div key={asset.id} draggable onDragStart={() => handleDragStart(asset.id, status.id)}>
                      <KanbanCard
                        asset={asset}
                        onQuickApprove={
                          onStatusChange && canTransitionStatus(asset.status, 'approved')
                            ? () => onStatusChange(asset.id, 'approved')
                            : undefined
                        }
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile view hint */}
      <div className="mt-4 px-4 lg:hidden text-xs text-muted-foreground text-center">
        Swipe to see more columns
      </div>
    </div>
  );
}
