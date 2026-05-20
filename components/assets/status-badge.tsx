'use client';

import { Badge } from '@/components/ui/badge';
import { assetStatusLabels } from '@/lib/asset-workflow';
import type { AssetStatus } from '@/types/index';
import { cn } from '@/lib/utils';

const statusClasses: Record<AssetStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
  in_design: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  ready_for_review: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  revision_requested: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  scheduled: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  uploaded: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  archived: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-300',
};

interface StatusBadgeProps {
  status: AssetStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      className={cn(
        'border-transparent text-xs font-semibold capitalize',
        statusClasses[status],
        className
      )}
    >
      {assetStatusLabels[status]}
    </Badge>
  );
}
