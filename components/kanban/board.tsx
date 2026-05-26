'use client';

import { useState, useCallback, useMemo } from 'react';
import { Asset, AssetStatus } from '@/types/index';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getAssetIcon, getAssetPreviewType } from '@/lib/asset-display';
import { StatusBadge } from '@/components/assets/status-badge';
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
import {
  getKanbanWorkflowColumnId,
  getKanbanWorkflowColumnIndex,
  getKanbanWorkflowStatusForColumn,
  isKanbanHiddenStatus,
  kanbanWorkflowColumns,
  type KanbanWorkflowColumnId,
} from '@/lib/kanban-workflow';

interface KanbanBoardProps {
  assets: Asset[];
  onStatusChange?: (assetId: string, newStatus: AssetStatus) => void;
}

function isOverdue(asset: Asset): boolean {
  if (
    asset.status === 'uploading' ||
    asset.status === 'uploaded' ||
    asset.status === 'processing' ||
    asset.status === 'approved' ||
    asset.status === 'published' ||
    asset.status === 'archived' ||
    asset.status === 'failed' ||
    asset.status === 'scheduled'
  ) return false;
  const daysSinceCreation = Math.floor((Date.now() - asset.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceCreation > 7;
}

function KanbanCard({ asset, onQuickApprove, isDragging }: { asset: Asset; onQuickApprove?: () => void; isDragging?: boolean }) {
  const [showActions, setShowActions] = useState(false);
  const revisionCount = asset.revisions.length;
  const commentCount = asset.comments.length;
  const overdue = isOverdue(asset);
  const AssetIcon = getAssetIcon(asset);
  const previewType = getAssetPreviewType(asset);

  return (
    <Card
      className={cn(
        'group relative mb-1 overflow-hidden border border-[rgba(255,255,255,0.07)] bg-[#161616] px-3 py-[10px] shadow-none transition-transform transition-colors duration-150 hover:border-[rgba(255,255,255,0.12)] hover:bg-[#1a1a1a]',
        overdue && 'border-[rgba(239,68,68,0.4)]',
        isDragging && 'scale-[1.02] border-[var(--primary)]'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <GripVertical className="h-3.5 w-3.5 text-[#52525b]" />
        </div>

        <Link href={`/dashboard/assets/${asset.id}`} className="min-w-0 flex-1">
          <div className="mb-2 overflow-hidden rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)]">
            {previewType === 'image' && asset.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.thumbnailUrl} alt={asset.title} className="h-14 w-full object-cover" />
            ) : (
              <div className="flex h-14 items-center gap-2 px-3 text-[11px] text-[#a1a1aa]">
                <AssetIcon className="h-4 w-4 text-[#71717a]" />
                <span className="truncate capitalize">{previewType}</span>
              </div>
            )}
          </div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-[13px] font-medium text-white">{asset.title}</h4>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-[#71717a]">
                <AssetIcon className="h-3.5 w-3.5 text-[#52525b]" />
                <span className="truncate">{asset.fileExtension ?? asset.mimeType?.split('/').pop() ?? asset.type}</span>
              </div>
            </div>
            {overdue && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#f59e0b]" />}
          </div>
        </Link>

        <button
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
          className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Quick actions"
        >
          <MoreHorizontal className="h-4 w-4 text-[#71717a] hover:text-white" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        {revisionCount > 0 && (
          <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-[rgba(255,255,255,0.06)] px-2 text-[10px] font-medium text-[#a1a1aa]">
            <Clock className="h-3 w-3" />
            {revisionCount}
          </span>
        )}
        {commentCount > 0 && (
          <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-[rgba(255,255,255,0.06)] px-2 text-[10px] font-medium text-[#a1a1aa]">
            <MessageSquare className="h-3 w-3" />
            {commentCount}
          </span>
        )}
        {isKanbanHiddenStatus(asset.status) && (
          <StatusBadge status={asset.status} className="h-5 border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[10px]" />
        )}
      </div>

      {showActions && (
        <div className="absolute right-2 top-2 z-50 rounded-md border border-[rgba(255,255,255,0.08)] bg-[#161616] p-1 text-xs shadow-lg">
          <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12px] text-white hover:bg-[rgba(255,255,255,0.06)]">
            <Eye className="h-3 w-3" />
            View
          </button>
          {asset.status === 'ready_for_review' && (
            <button onClick={onQuickApprove} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12px] text-[#34d399] hover:bg-[rgba(16,185,129,0.1)]">
              <CheckCircle2 className="h-3 w-3" />
              Approve
            </button>
          )}
          <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12px] text-white hover:bg-[rgba(255,255,255,0.06)]">
            <Copy className="h-3 w-3" />
            Copy link
          </button>
        </div>
      )}
    </Card>
  );
}

export function KanbanBoard({ assets, onStatusChange }: KanbanBoardProps) {
  const [collapsedColumns, setCollapsedColumns] = useState<Set<KanbanWorkflowColumnId>>(new Set());
  const [draggedItem, setDraggedItem] = useState<{ assetId: string; fromStatus: AssetStatus } | null>(null);

  const toggleColumnCollapse = useCallback((statusId: KanbanWorkflowColumnId) => {
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

  const handleDrop = (e: React.DragEvent, toColumnId: KanbanWorkflowColumnId) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-primary');
    const targetStatus = getKanbanWorkflowStatusForColumn(toColumnId);

    if (!draggedItem || draggedItem.fromStatus === targetStatus) {
      return;
    }

    const fromColumnId = getKanbanWorkflowColumnId(draggedItem.fromStatus);
    const fromIndex = getKanbanWorkflowColumnIndex(fromColumnId);
    const toIndex = getKanbanWorkflowColumnIndex(toColumnId);

    if (Math.abs(fromIndex - toIndex) > 1) {
      setDraggedItem(null);
      return;
    }

    setDraggedItem(null);
    onStatusChange?.(draggedItem.assetId, getKanbanWorkflowStatusForColumn(toColumnId));
  };

  const assetsByStatus = useMemo(() => {
    const map = new Map<KanbanWorkflowColumnId, Asset[]>();
    kanbanWorkflowColumns.forEach((column) => map.set(column.id, []));

    for (const asset of assets) {
      if (isKanbanHiddenStatus(asset.status)) {
        continue;
      }
      const columnId = getKanbanWorkflowColumnId(asset.status);
      const bucket = map.get(columnId);
      if (bucket) {
        bucket.push(asset);
      }
    }

    return map;
  }, [assets]);

  return (
    <div className="-mx-4 overflow-x-auto pb-4 px-4 scroll-smooth overscroll-x-contain snap-x snap-mandatory lg:mx-0 lg:px-0">
      <div className="flex min-w-max gap-4">
        {kanbanWorkflowColumns.map((status) => {
          const statusAssets = assetsByStatus.get(status.id) || [];
          const isCollapsed = collapsedColumns.has(status.id);

          return (
            <div
              key={status.id}
              className="flex min-w-[320px] max-w-[320px] flex-shrink-0 snap-start flex-col"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-[10px] border border-b-0 border-[rgba(255,255,255,0.06)] bg-[#111111] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', status.accentClassName)} />
                  <button
                    onClick={() => toggleColumnCollapse(status.id)}
                    className="rounded p-0.5 transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                    aria-label={isCollapsed ? 'Expand column' : 'Collapse column'}
                  >
                    {isCollapsed ? (
                      <ChevronUp className="h-4 w-4 text-[#52525b]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#52525b]" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-[13px] font-medium text-white">
                        {status.label}
                      </h3>
                    </div>
                  </div>
                </div>
                <span className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-2 text-[10px] font-medium', status.counterClassName)}>
                  {statusAssets.length}
                </span>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status.id)}
                className={cn(
                  'flex min-h-[400px] flex-1 flex-col overflow-y-auto rounded-b-[10px] border border-t-0 border-[rgba(255,255,255,0.06)] bg-[#0f0f0f] p-2 pr-1 transition-all [scrollbar-color:rgba(255,255,255,0.2)_rgba(255,255,255,0.08)] [scrollbar-width:thin]',
                  draggedItem ? 'bg-[rgba(255,255,255,0.02)]' : ''
                )}
              >
                {isCollapsed ? (
                  <div className="flex items-center justify-center py-8 text-[12px] text-[#71717a]">
                    {statusAssets.length} items
                  </div>
                ) : statusAssets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[12px] text-[#71717a]">
                    <div className="mb-2 text-2xl">⚡</div>
                    <p>No assets</p>
                  </div>
                ) : (
                  statusAssets.map((asset) => (
                    <div key={asset.id} draggable onDragStart={() => handleDragStart(asset.id, asset.status)} className="last:mb-0">
                        <KanbanCard
                          asset={asset}
                          isDragging={draggedItem?.assetId === asset.id}
                          onQuickApprove={
                            onStatusChange && (asset.status === 'ready_for_review' || asset.status === 'revision_requested')
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

      <div className="mt-4 px-4 text-center text-xs text-[#71717a] lg:hidden">
        Swipe to see more columns
      </div>
    </div>
  );
}
