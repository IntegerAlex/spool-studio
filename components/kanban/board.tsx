"use client"

import { AnimatePresence, motion } from "framer-motion"
import Lenis from "lenis"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Eye,
  GripVertical,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react"
import Link from "next/link"
import { useKanbanStore } from "@/stores/kanban-store"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { StatusBadge } from "@/components/assets/status-badge"
import { getAssetIcon, getAssetPreviewType } from "@/lib/asset-display"
import {
  getKanbanWorkflowColumnId,
  getKanbanWorkflowColumnIndex,
  getKanbanWorkflowStatusForColumn,
  isKanbanHiddenStatus,
  type KanbanWorkflowColumnId,
  kanbanWorkflowColumns,
} from "@/lib/kanban-workflow"
import { cn } from "@/lib/utils"
import type { Asset, AssetStatus } from "@/types/index"

interface KanbanBoardProps {
  assets: Asset[]
  onStatusChange?: (assetId: string, newStatus: AssetStatus) => void
  canApprove?: boolean
}

function isOverdue(asset: Asset): boolean {
  if (
    asset.status === "uploading" ||
    asset.status === "uploaded" ||
    asset.status === "processing" ||
    asset.status === "approved" ||
    asset.status === "published" ||
    asset.status === "archived" ||
    asset.status === "failed" ||
    asset.status === "scheduled"
  )
    return false
  const daysSinceCreation = Math.floor(
    (Date.now() - asset.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  )
  return daysSinceCreation > 7
}

function KanbanCard({
  asset,
  onQuickApprove,
  isDragging,
  canApprove = true,
}: {
  asset: Asset
  onQuickApprove?: () => void
  isDragging?: boolean
  canApprove?: boolean
}) {
  const [showActions, setShowActions] = useState(false)
  const revisionCount = asset.revisions.length
  const commentCount = asset.comments.length
  const overdue = isOverdue(asset)
  const AssetIcon = getAssetIcon(asset)
  const previewType = getAssetPreviewType(asset)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{
        opacity: 1,
        scale: isDragging ? 1.03 : 1,
        y: 0,
        boxShadow: isDragging
          ? "0 20px 40px rgba(0,0,0,0.4), 0 0 0 2px rgba(16,185,129,0.3)"
          : "0 0 0 0px rgba(0,0,0,0)",
      }}
      exit={{ opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.2 } }}
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.2 },
        scale: { type: "spring", stiffness: 400, damping: 25 },
      }}
      whileHover={
        !isDragging ? { y: -2, transition: { duration: 0.15 } } : undefined
      }
      className={cn(
        "group relative mb-2 overflow-hidden kanban-card shadow-none",
        overdue && "border-[rgba(239,68,68,0.4)]",
        isDragging && "z-50",
      )}
    >
      <div className="flex items-start gap-2">
        {canApprove && (
          <div className="mt-0.5 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <GripVertical className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
          </div>
        )}

        <Link href={`/dashboard/assets/${asset.id}`} className="min-w-0 flex-1">
          <div className="mb-2 overflow-hidden rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)]">
            {previewType === "image" && asset.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset.thumbnailUrl}
                alt={asset.title}
                className="h-14 w-full object-cover"
              />
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
                <span className="truncate capitalize">
                  {asset.fileExtension ??
                    asset.mimeType?.split("/").pop() ??
                    asset.type}
                </span>
              </div>
            </div>
            {overdue && (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#ca8a04]" />
            )}
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

      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-2 top-2 z-50 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-1 text-xs shadow-lg"
          >
            <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12px] text-white hover:bg-[var(--color-bg-hover)]">
              <Eye className="h-3 w-3" />
              View
            </button>
            {asset.status === "revision_requested" && (
              <button
                onClick={onQuickApprove}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12px] text-[#16a34a] hover:bg-[rgba(22,163,74,0.1)]"
              >
                <CheckCircle2 className="h-3 w-3" />
                Approve
              </button>
            )}
            <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12px] text-white hover:bg-[var(--color-bg-hover)]">
              <Copy className="h-3 w-3" />
              Copy link
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function areEqual(prev: any, next: any) {
  const a = prev.asset
  const b = next.asset
  if (a.id !== b.id) return false
  if (a.title !== b.title) return false
  if (a.status !== b.status) return false
  if (a.thumbnailUrl !== b.thumbnailUrl) return false
  if ((a.revisions?.length ?? 0) !== (b.revisions?.length ?? 0)) return false
  if ((a.comments?.length ?? 0) !== (b.comments?.length ?? 0)) return false
  return (
    prev.isDragging === next.isDragging &&
    prev.onQuickApprove === next.onQuickApprove &&
    prev.canApprove === next.canApprove
  )
}

const MemoizedKanbanCard = React.memo(KanbanCard, areEqual)

function KanbanColumn({
  status,
  assets: columnAssets,
  isCollapsed,
  onToggleCollapse,
  draggedItem,
  onDragStart,
  onDrop,
  onStatusChange,
  canApprove = true,
}: {
  status: (typeof kanbanWorkflowColumns)[number]
  assets: Asset[]
  isCollapsed: boolean
  onToggleCollapse: () => void
  draggedItem: { assetId: string; fromStatus: AssetStatus } | null
  onDragStart: (assetId: string, status: AssetStatus) => void
  onDrop: (e: React.DragEvent, toColumnId: KanbanWorkflowColumnId) => void
  onStatusChange?: (assetId: string, newStatus: AssetStatus) => void
  canApprove?: boolean
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  let dotColor = "#52525b"
  if (status.id === "draft") dotColor = "#525252"
  else if (status.id === "revision") dotColor = "#ca8a04"
  else if (status.id === "approved") dotColor = "#16a34a"
  else if (status.id === "published") dotColor = "#3b82f6"

  return (
    <div className="kanban-column-container">
      <div className="kanban-column-header">
        <div className="flex items-center gap-2">
          <span
            className="h-[6px] w-[6px] shrink-0 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
          <button
            onClick={onToggleCollapse}
            className="rounded p-0.5 transition-colors hover:bg-[rgba(255,255,255,0.04)]"
            aria-label={isCollapsed ? "Expand column" : "Collapse column"}
          >
            <motion.div
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
            </motion.div>
          </button>
          <h3 className="kanban-column-title truncate">{status.label}</h3>
        </div>
        <motion.span
          key={columnAssets.length}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="kanban-column-counter"
        >
          {columnAssets.length}
        </motion.span>
      </div>

      <motion.div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          setIsDragOver(false)
          onDrop(e, status.id)
        }}
        animate={{
          backgroundColor: isDragOver
            ? "rgba(255,255,255,0.03)"
            : "rgba(255,255,255,0)",
          borderColor: isDragOver
            ? "rgba(16,185,129,0.3)"
            : "rgba(255,255,255,0.06)",
        }}
        transition={{ duration: 0.15 }}
        className="kanban-column-body border border-transparent rounded-lg"
      >
        <AnimatePresence mode="popLayout">
          {isCollapsed ? (
            <motion.div
              key="collapsed"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="flex items-center justify-center py-8 text-[12px] text-[var(--color-text-muted)]"
            >
              {columnAssets.length} items
            </motion.div>
          ) : columnAssets.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-[32px] px-[16px] text-center"
            >
              <svg
                className="w-[28px] h-[28px] text-[var(--color-text-faint)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="5" y="5" width="14" height="3" rx="0.5" />
                <rect x="5" y="10" width="14" height="3" rx="0.5" />
                <rect x="5" y="15" width="14" height="3" rx="0.5" />
              </svg>
              <p className="text-[12px] text-[var(--color-text-faint)] mt-2">
                No assets
              </p>
            </motion.div>
          ) : (
            columnAssets.map((asset) => (
              <div
                key={asset.id}
                draggable={canApprove}
                onDragStart={
                  canApprove
                    ? () => onDragStart(asset.id, asset.status)
                    : undefined
                }
                className="last:mb-0"
              >
                <MemoizedKanbanCard
                  asset={asset}
                  isDragging={draggedItem?.assetId === asset.id}
                  canApprove={canApprove}
                  onQuickApprove={
                    onStatusChange && asset.status === "revision_requested"
                      ? () => onStatusChange(asset.id, "approved")
                      : undefined
                  }
                />
              </div>
            ))
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export function KanbanBoard({ assets, onStatusChange, canApprove = true }: KanbanBoardProps) {
  const collapsedColumnIds = useKanbanStore((state) => state.collapsedColumns)
  const toggleColumnStore = useKanbanStore((state) => state.toggleColumn)
  const collapsedColumns = new Set(collapsedColumnIds)
  const [draggedItem, setDraggedItem] = useState<{
    assetId: string
    fromStatus: AssetStatus
  } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    if (!scrollRef.current) return

    const lenis = new Lenis({
      wrapper: scrollRef.current,
// SAFETY: this cast is safe because the value already conforms to the asserted type.
      content: scrollRef.current.firstElementChild as HTMLElement,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      touchMultiplier: 2,
      infinite: false,
    })

    lenisRef.current = lenis

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  const toggleColumnCollapse = useCallback(
    (statusId: KanbanWorkflowColumnId) => {
      toggleColumnStore(statusId)
    },
    [toggleColumnStore],
  )

  const handleDragStart = (assetId: string, status: AssetStatus) => {
    setDraggedItem({ assetId, fromStatus: status })
  }

  const handleDrop = (
    e: React.DragEvent,
    toColumnId: KanbanWorkflowColumnId,
  ) => {
    e.preventDefault()
    const targetStatus = getKanbanWorkflowStatusForColumn(toColumnId)

    if (!draggedItem || draggedItem.fromStatus === targetStatus) {
      setDraggedItem(null)
      return
    }

    const fromColumnId = getKanbanWorkflowColumnId(draggedItem.fromStatus)
    const fromIndex = getKanbanWorkflowColumnIndex(fromColumnId)
    const toIndex = getKanbanWorkflowColumnIndex(toColumnId)

    if (Math.abs(fromIndex - toIndex) > 1) {
      setDraggedItem(null)
      return
    }

    const assetId = draggedItem.assetId
    setDraggedItem(null)
    onStatusChange?.(assetId, getKanbanWorkflowStatusForColumn(toColumnId))
  }

  const assetsByStatus = useMemo(() => {
    const map = new Map<KanbanWorkflowColumnId, Asset[]>()
    kanbanWorkflowColumns.forEach((column) => map.set(column.id, []))

    for (const asset of assets) {
      if (isKanbanHiddenStatus(asset.status)) {
        continue
      }
      const columnId = getKanbanWorkflowColumnId(asset.status)
      const bucket = map.get(columnId)
      if (bucket) {
        bucket.push(asset)
      }
    }

    return map
  }, [assets])

  return (
    <div ref={scrollRef} className="kanban-board-wrapper overflow-x-auto">
      <div className="flex min-w-max gap-4">
        {kanbanWorkflowColumns.map((status) => (
          <KanbanColumn
            key={status.id}
            status={status}
            assets={assetsByStatus.get(status.id) || []}
            isCollapsed={collapsedColumns.has(status.id)}
            onToggleCollapse={() => toggleColumnCollapse(status.id)}
            draggedItem={draggedItem}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onStatusChange={onStatusChange}
            canApprove={canApprove}
          />
        ))}
      </div>

      <div className="mt-4 px-4 text-center text-xs text-[var(--color-text-muted)] lg:hidden">
        Swipe to see more columns
      </div>
    </div>
  )
}
