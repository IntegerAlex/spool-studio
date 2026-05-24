import type { AssetStatus } from '@/types/index';

export type KanbanWorkflowColumnId = 'draft' | 'review' | 'approved' | 'published';

export interface KanbanWorkflowColumn {
  id: KanbanWorkflowColumnId;
  label: string;
  accentClassName: string;
  counterClassName: string;
}

export const kanbanWorkflowColumns: KanbanWorkflowColumn[] = [
  {
    id: 'draft',
    label: 'Draft',
    accentClassName: 'bg-slate-400',
    counterClassName: 'border-[rgba(148,163,184,0.2)] bg-[rgba(148,163,184,0.12)] text-slate-200',
  },
  {
    id: 'review',
    label: 'Review',
    accentClassName: 'bg-amber-400',
    counterClassName: 'border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.14)] text-amber-200',
  },
  {
    id: 'approved',
    label: 'Approved',
    accentClassName: 'bg-emerald-400',
    counterClassName: 'border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.12)] text-emerald-200',
  },
  {
    id: 'published',
    label: 'Published',
    accentClassName: 'bg-sky-400',
    counterClassName: 'border-[rgba(56,189,248,0.2)] bg-[rgba(56,189,248,0.12)] text-sky-200',
  },
];

export const kanbanWorkflowColumnIds = kanbanWorkflowColumns.map((column) => column.id) as KanbanWorkflowColumnId[];

export const kanbanVisibleWorkflowStatuses: AssetStatus[] = [
  'draft',
  'ready_for_review',
  'approved',
  'published',
];

const columnByStatus: Record<AssetStatus, KanbanWorkflowColumnId> = {
  draft: 'draft',
  uploading: 'draft',
  uploaded: 'draft',
  processing: 'review',
  failed: 'review',
  in_design: 'review',
  ready_for_review: 'review',
  revision_requested: 'review',
  scheduled: 'published',
  approved: 'approved',
  published: 'published',
  archived: 'published',
};

const statusByColumn: Record<KanbanWorkflowColumnId, AssetStatus> = {
  draft: 'draft',
  review: 'ready_for_review',
  approved: 'approved',
  published: 'published',
};

export function getKanbanWorkflowColumnId(status: AssetStatus): KanbanWorkflowColumnId {
  return columnByStatus[status] ?? 'draft';
}

export function getKanbanWorkflowStatusForColumn(columnId: KanbanWorkflowColumnId): AssetStatus {
  return statusByColumn[columnId];
}

export function isKanbanHiddenStatus(status: AssetStatus): boolean {
  return !kanbanVisibleWorkflowStatuses.includes(status);
}

export function getKanbanWorkflowColumnIndex(columnId: KanbanWorkflowColumnId): number {
  return kanbanWorkflowColumnIds.indexOf(columnId);
}