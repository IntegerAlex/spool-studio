'use client';

import { useState, useCallback, useMemo } from 'react';
import React from 'react';
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
  // shallow compare relevant asset fields to avoid unnecessary rerenders
  const [showActions, setShowActions] = useState(false);
  const revisionCount = asset.revisions.length;
  const commentCount = asset.comments.length;
  const overdue = isOverdue(asset);
  const AssetIcon = getAssetIcon(asset);
  const previewType = getAssetPreviewType(asset);

  return (
    <Card
      className={cn(
        'group relative mb-2 overflow-hidden kanban-card shadow-none',
        overdue && 'border-[rgba(239,68,68,0.4)]',
        isDragging && 'scale-[1.02] border-[var(--color-border-strong)]'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <GripVertical className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
        </div>

        <Link href={`/dashboard/assets/${asset.id}`} className="min-w-0 flex-1">
          <div className="mb-2 overflow-hidden rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)]">
            {previewType === 'image' && asset.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.thumbnailUrl} alt={asset.title} className="h-14 w-full object-cover" />
            ) : (
              <div className="flex h-14 items-center gap-2 px-3 text-[11px] text-[var(--color-text-secondary)]">
                <AssetIcon className="h-4 w-4 text-[var(--color-text-faint)]" />
                <span className="truncate capitalize">{previewType}</span>
              </div>
            )}
          </div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="truncate kanban-card-title">{asset.title}</h4>
              <div className="mt-1 flex items-center gap-1 kanban-card-meta">
                <AssetIcon className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
                <span className="truncate">{asset.fileExtension ?? asset.mimeType?.split('/').pop() ?? asset.type}</span>
              </div>
            </div>
            {overdue && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#ca8a04]" />}
          </div>
        </Link>

        <button
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
          className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Quick actions"
        >
          <MoreHorizontal className="h-4 w-4 text-[var(--color-text-faint)] hover:text-white" />
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
        <StatusBadge status={asset.status} />
        {revisionCount > 0 && (
          <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-[rgba(255,255,255,0.04)] px-2 text-[10px] font-medium text-[var(--color-text-secondary)]">
            <Clock className="h-3 w-3" />
            {revisionCount}
          </span>
        )}
        {commentCount > 0 && (
          <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-[rgba(255,255,255,0.04)] px-2 text-[10px] font-medium text-[var(--color-text-secondary)]">
            <MessageSquare className="h-3 w-3" />
            {commentCount}
          </span>
        )}
      </div>

      {showActions && (
        <div className="absolute right-2 top-2 z-50 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-1 text-xs shadow-lg">
          <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12px] text-white hover:bg-[var(--color-bg-hover)]">
            <Eye className="h-3 w-3" />
            View
          </button>
          {asset.status === 'revision_requested' && (
            <button onClick={onQuickApprove} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12px] text-[#16a34a] hover:bg-[rgba(22,163,74,0.1)]">
              <CheckCircle2 className="h-3 w-3" />
              Approve
            </button>
          )}
          <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12px] text-white hover:bg-[var(--color-bg-hover)]">
            <Copy className="h-3 w-3" />
            Copy link
          </button>
        </div>
      )}
    </Card>
  );
}

function areEqual(prev: any, next: any) {
  const a = prev.asset;
  const b = next.asset;
  if (a.id !== b.id) return false;
  if (a.title !== b.title) return false;
  if (a.status !== b.status) return false;
  if (a.thumbnailUrl !== b.thumbnailUrl) return false;
  if ((a.revisions?.length ?? 0) !== (b.revisions?.length ?? 0)) return false;
  if ((a.comments?.length ?? 0) !== (b.comments?.length ?? 0)) return false;
  return prev.isDragging === next.isDragging && prev.onQuickApprove === next.onQuickApprove;
}

const MemoizedKanbanCard = React.memo(KanbanCard, areEqual);

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
    e.currentTarget.classList.add('ring-1', 'ring-[var(--color-border-strong)]');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-1', 'ring-[var(--color-border-strong)]');
  };

  const handleDrop = (e: React.DragEvent, toColumnId: KanbanWorkflowColumnId) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-1', 'ring-[var(--color-border-strong)]');
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
    <div className="kanban-board-wrapper">
      <div className="flex min-w-max gap-4">
        {kanbanWorkflowColumns.map((status) => {
          const statusAssets = assetsByStatus.get(status.id) || [];
          const isCollapsed = collapsedColumns.has(status.id);
          
          let dotColor = '#52525b';
          if (status.id === 'draft') {
            dotColor = '#525252';
          } else if (status.id === 'revision') {
            dotColor = '#ca8a04';
          } else if (status.id === 'approved') {
            dotColor = '#16a34a';
          } else if (status.id === 'published') {
            dotColor = '#3b82f6';
          }

          return (
            <div key={status.id} className="kanban-column-container">
              <div className="kanban-column-header">
                <div className="flex items-center gap-2">
                  <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
                  <button
                    onClick={() => toggleColumnCollapse(status.id)}
                    className="rounded p-0.5 transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                    aria-label={isCollapsed ? 'Expand column' : 'Collapse column'}
                  >
                    {isCollapsed ? (
                      <ChevronUp className="h-4 w-4 text-[var(--color-text-muted)]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
                    )}
                  </button>
                  <h3 className="kanban-column-title truncate">{status.label}</h3>
                </div>
                <span className="kanban-column-counter">
                  {statusAssets.length}
                </span>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status.id)}
                className={cn(
                  'kanban-column-body transition-all',
                  draggedItem ? 'bg-[rgba(255,255,255,0.01)]' : ''
                )}
              >
                {isCollapsed ? (
                  <div className="flex items-center justify-center py-8 text-[12px] text-[var(--color-text-muted)]">
                    {statusAssets.length} items
                  </div>
                ) : statusAssets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-[32px] px-[16px] text-center">
                    <svg className="w-[28px] h-[28px] text-[var(--color-text-faint)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="5" y="5" width="14" height="3" rx="0.5" />
                      <rect x="5" y="10" width="14" height="3" rx="0.5" />
                      <rect x="5" y="15" width="14" height="3" rx="0.5" />
                    </svg>
                    <p className="text-[12px] text-[var(--color-text-faint)] mt-2">No assets</p>
                  </div>
                ) : (
                  statusAssets.map((asset) => (
                    <div key={asset.id} draggable onDragStart={() => handleDragStart(asset.id, asset.status)} className="last:mb-0">
                      <MemoizedKanbanCard
                        asset={asset}
                        isDragging={draggedItem?.assetId === asset.id}
                        onQuickApprove={
                          onStatusChange && asset.status === 'revision_requested'
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

      <div className="mt-4 px-4 text-center text-xs text-[var(--color-text-muted)] lg:hidden">
        Swipe to see more columns
      </div>
    </div>
  );
}
