import type { AssetStatus } from '@/types/index';

export const assetStatusOrder: AssetStatus[] = [
  'draft',
  'in_design',
  'ready_for_review',
  'revision_requested',
  'approved',
  'scheduled',
  'uploaded',
  'archived',
];

export const assetStatusLabels: Record<AssetStatus, string> = {
  draft: 'Draft',
  in_design: 'In Design',
  ready_for_review: 'Ready for Review',
  revision_requested: 'Revision Requested',
  approved: 'Approved',
  scheduled: 'Scheduled',
  uploaded: 'Uploaded',
  archived: 'Archived',
};

const statusTransitions: Record<AssetStatus, AssetStatus[]> = {
  draft: ['in_design'],
  in_design: ['ready_for_review'],
  ready_for_review: ['revision_requested', 'approved'],
  revision_requested: ['approved'],
  approved: ['scheduled'],
  scheduled: ['uploaded'],
  uploaded: ['archived'],
  archived: [],
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
  if (from === 'ready_for_review' && to === 'approved') {
    return 'Approve';
  }
  if (from === 'ready_for_review' && to === 'revision_requested') {
    return 'Request Revisions';
  }
  if (from === 'revision_requested' && to === 'approved') {
    return 'Approve';
  }
  if (to === 'archived') {
    return 'Archive';
  }
  if (to === 'scheduled') {
    return 'Schedule';
  }
  return `Move to ${assetStatusLabels[to]}`;
}
