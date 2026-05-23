'use client';

import { useState, useCallback, useMemo } from 'react';
import { Asset, AssetStatus } from '@/types/index';
import { assetStatusMeta, assetStatusOrder, canTransitionStatus } from '@/lib/asset-workflow';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getAssetIcon } from '@/lib/asset-display';
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

const systemStatuses: AssetStatus[] = ['uploading', 'uploaded', 'processing', 'failed', 'published', 'archived'];

const statuses = assetStatusOrder.map((status) => ({
  id: status,
  label: assetStatusMeta[status].label,
  isSystem: systemStatuses.includes(status),
}));

function isOverdue(asset: Asset): boolean {
  if (
    asset.status === 'uploading' ||
    asset.status === 'uploaded' ||
    asset.status === 'processing' ||
    asset.status === 'approved' ||
    asset.status === 'published' ||
    asset.status === 'archived' ||
    asset.status === 'failed'
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
        {asset.status === 'approved' && (
          <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-[rgba(16,185,129,0.14)] px-2 text-[10px] font-medium text-[#34d399]">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </span>
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
      <div className="flex gap-3 min-w-max">
        {statuses.map((status) => {
          const statusAssets = assetsByStatus.get(status.id) || [];
          const isCollapsed = collapsedColumns.has(status.id);
          const isSystemStatus = status.isSystem;

          return (
            <div
              key={status.id}
              className="flex min-w-[260px] flex-shrink-0 flex-col"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-[10px] border border-b-0 border-[rgba(255,255,255,0.06)] bg-[#111111] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', isSystemStatus ? 'bg-[#f59e0b]' : 'bg-[var(--primary)]')} />
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
                      <h3 className={cn('truncate text-[13px] font-medium', isSystemStatus ? 'text-[#a1a1aa]' : 'text-white')}>
                        {status.label}
                      </h3>
                      {isSystemStatus && <span className="text-[10px] uppercase tracking-[0.18em] text-[#52525b]">system</span>}
                    </div>
                  </div>
                </div>
                <span className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-2 text-[10px] font-medium', isSystemStatus ? 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-[#71717a]' : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.08)] text-[#a1a1aa]')}>
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
                    <div key={asset.id} draggable onDragStart={() => handleDragStart(asset.id, status.id)} className="last:mb-0">
                        <KanbanCard
                          asset={asset}
                          isDragging={draggedItem?.assetId === asset.id}
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

      <div className="mt-4 px-4 text-center text-xs text-[#71717a] lg:hidden">
        Swipe to see more columns
      </div>
    </div>
  );
}
