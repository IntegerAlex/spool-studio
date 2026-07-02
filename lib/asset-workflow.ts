import { BadgeCheck, Archive, AlertCircle, CalendarClock, Eye, FileText, Globe2, Loader2, MessageSquareWarning, PenTool } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AssetStatus } from '@/types/index';

export const assetStatusValues = [
  'draft',
  'uploading',
  'uploaded',
  'processing',
  'approved',
  'published',
  'failed',
  'archived',
  'in_design',
  'ready_for_review',
  'revision_requested',
  'scheduled',
] as const satisfies readonly AssetStatus[];

export const userSelectableStatusValues = [
  'draft',
  'ready_for_review',
  'revision_requested',
  'approved',
  'published',
] as const satisfies readonly AssetStatus[];

export const systemControlledStatusValues = [
  'uploading',
  'uploaded',
  'processing',
  'failed',
  'published',
  'archived',
] as const satisfies readonly AssetStatus[];

export const assetStatusOrder: AssetStatus[] = [
  'draft',
  'uploading',
  'uploaded',
  'processing',
  'in_design',
  'ready_for_review',
  'revision_requested',
  'approved',
  'scheduled',
  'published',
  'failed',
  'archived',
];

export interface AssetStatusMeta {
  label: string;
  badgeClassName: string;
  icon: LucideIcon;
}

export const assetStatusMeta: Record<AssetStatus, AssetStatusMeta> = {
  draft: {
    label: 'Draft',
    badgeClassName: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
    icon: FileText,
  },
  uploading: {
    label: 'Uploading',
    badgeClassName: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    icon: Loader2,
  },
  uploaded: {
    label: 'Uploaded',
    badgeClassName: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    icon: BadgeCheck,
  },
  processing: {
    label: 'Processing',
    badgeClassName: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    icon: Loader2,
  },
  approved: {
    label: 'Approved',
    badgeClassName: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    icon: BadgeCheck,
  },
  published: {
    label: 'Published',
    badgeClassName: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    icon: Globe2,
  },
  failed: {
    label: 'Failed',
    badgeClassName: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    icon: AlertCircle,
  },
  archived: {
    label: 'Archived',
    badgeClassName: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-300',
    icon: Archive,
  },
  in_design: {
    label: 'In Design',
    badgeClassName: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    icon: PenTool,
  },
  ready_for_review: {
    label: 'Draft',
    badgeClassName: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    icon: Eye,
  },
  revision_requested: {
    label: 'Revision',
    badgeClassName: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    icon: MessageSquareWarning,
  },
  scheduled: {
    label: 'Scheduled',
    badgeClassName: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    icon: CalendarClock,
  },
};

export const assetStatusLabels: Record<AssetStatus, string> = {
  draft: assetStatusMeta.draft.label,
  uploading: assetStatusMeta.uploading.label,
  uploaded: assetStatusMeta.uploaded.label,
  processing: assetStatusMeta.processing.label,
  approved: assetStatusMeta.approved.label,
  published: assetStatusMeta.published.label,
  failed: assetStatusMeta.failed.label,
  archived: assetStatusMeta.archived.label,
  in_design: assetStatusMeta.in_design.label,
  ready_for_review: assetStatusMeta.ready_for_review.label,
  revision_requested: assetStatusMeta.revision_requested.label,
  scheduled: assetStatusMeta.scheduled.label,
};

export const assetEditorStatusLabels: Partial<Record<AssetStatus, string>> = {
  draft: 'Draft',
  in_design: 'In Design',
  ready_for_review: 'Review',
  revision_requested: 'Revision',
  approved: 'Approved',
  published: 'Published',
};

export function isUserSelectableStatus(status: AssetStatus): boolean {
  return (userSelectableStatusValues as readonly AssetStatus[]).includes(status);
}

export function isSystemControlledStatus(status: AssetStatus): boolean {
  return (systemControlledStatusValues as readonly AssetStatus[]).includes(status);
}

export function getUserSelectableStatuses(): AssetStatus[] {
  return [...userSelectableStatusValues];
}

export function getSystemControlledStatuses(): AssetStatus[] {
  return [...systemControlledStatusValues];
}

const uploadEligibleStatuses: AssetStatus[] = ['draft', 'in_design', 'ready_for_review', 'revision_requested'];

const uploadBlockedReasons: Partial<Record<AssetStatus, string>> = {
  approved: 'Approved assets cannot replace media files.',
  published: 'Published assets cannot replace media files.',
  archived: 'Archived assets cannot replace media files.',
  uploading: 'Assets already uploading must finish their current upload first.',
  uploaded: 'Assets already uploaded are awaiting processing.',
  processing: 'Assets under processing cannot replace media files.',
  failed: 'Failed assets must be re-queued from a workflow state before uploading.',
};

export function canUploadFromStatus(status: AssetStatus): boolean {
  return uploadEligibleStatuses.includes(status);
}

export function canUploadRevisionFromStatus(status: AssetStatus): boolean {
  return status !== 'archived' && status !== 'published';
}

export function getRevisionEligibilityReason(status: AssetStatus): string {
  if (canUploadRevisionFromStatus(status)) {
    return 'Revisions are allowed for this workflow state.';
  }

  return 'Revisions are blocked only for archived or published assets.';
}

export function getUploadEligibilityReason(status: AssetStatus): string {
  if (canUploadFromStatus(status)) {
    return 'Upload allowed from current workflow state.';
  }

  return uploadBlockedReasons[status] ?? 'Uploads are not allowed from this workflow state.';
}

const statusTransitions: Record<AssetStatus, AssetStatus[]> = {
  draft: ['uploading', 'in_design', 'ready_for_review', 'revision_requested'],
  uploading: ['uploaded', 'failed'],
  uploaded: ['processing', 'archived', 'draft'],
  processing: ['ready_for_review', 'failed'],
  approved: ['scheduled', 'published', 'revision_requested'],
  published: ['archived'],
  failed: ['uploading', 'in_design'],
  archived: [],
  in_design: ['ready_for_review', 'approved'],
  ready_for_review: ['revision_requested', 'approved'],
  revision_requested: ['approved', 'ready_for_review'],
  scheduled: ['uploaded', 'archived'],
};

export function getAllowedTransitions(status: AssetStatus): AssetStatus[] {
  return statusTransitions[status] ?? [];
}

export function canTransitionStatus(
  currentStatus: AssetStatus,
  nextStatus: AssetStatus
): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }
  return getAllowedTransitions(currentStatus).includes(nextStatus);
}

export function getTransitionActionLabel(
  from: AssetStatus,
  to: AssetStatus
): string {
  if (to === 'uploading') {
    return 'Start Upload';
  }
  if (from === 'uploading' && to === 'uploaded') {
    return 'Complete Upload';
  }
  if (to === 'processing') {
    return 'Process';
  }
  if (to === 'ready_for_review') {
    return 'Send for Review';
  }
  if (to === 'published') {
    return 'Publish';
  }
  if (to === 'failed') {
    return 'Mark Failed';
  }
  if (from === 'ready_for_review' && to === 'approved') {
    return 'Approve';
  }
  if (from === 'ready_for_review' && to === 'revision_requested') {
    return 'Request Revisions';
  }
  if (from === 'revision_requested' && to === 'approved') {
    return 'Approve';
  }
  if (from === 'approved' && to === 'revision_requested') {
    return 'Send to Revision';
  }
  if (to === 'archived') {
    return 'Archive';
  }
  if (to === 'scheduled') {
    return 'Schedule';
  }
  return `Move to ${assetStatusLabels[to]}`;
}
