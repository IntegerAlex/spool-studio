'use client';

import { Badge } from '@/components/ui/badge';
import type { AssetStatus } from '@/types/index';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StatusBadgeProps {
  status: AssetStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const labels: Record<AssetStatus, string> = {
    draft: 'Draft',
    uploading: 'Uploading',
    uploaded: 'Uploaded',
    processing: 'Processing',
    approved: 'Approved',
    published: 'Published',
    failed: 'Failed',
    archived: 'Archived',
    in_design: 'Draft',
    ready_for_review: 'Draft',
    revision_requested: 'Revision',
    scheduled: 'Scheduled',
  };

  const styles: Record<AssetStatus, string> = {
    draft: 'border-[rgba(113,113,122,0.3)] bg-[rgba(113,113,122,0.2)] text-[#a1a1aa]',
    uploading: 'border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.15)] text-[#818cf8]',
    uploaded: 'border-[rgba(20,184,166,0.3)] bg-[rgba(20,184,166,0.15)] text-[#2dd4bf]',
    processing: 'border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.15)] text-[#c084fc]',
    approved: 'border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.15)] text-[#34d399]',
    published: 'border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.15)] text-[#34d399]',
    failed: 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.15)] text-[#f87171]',
    archived: 'border-[rgba(113,113,122,0.15)] bg-[rgba(113,113,122,0.1)] text-[#52525b]',
    in_design: 'border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.15)] text-[#60a5fa]',
    ready_for_review: 'border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.15)] text-[#fbbf24]',
    revision_requested: 'border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.15)] text-[#fbbf24]',
    scheduled: 'border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.15)] text-[#818cf8]',
  };

  return (
    <Badge
      className={cn(
        'inline-flex h-[18px] rounded-full border px-2 py-0 text-[10px] font-medium capitalize leading-none',
        styles[status],
        className
      )}
    >
      {(status === 'uploading' || status === 'processing') && (
        <span className={cn('mr-1 size-[6px] rounded-full bg-current animate-status-pulse')} />
      )}
      {status === 'published' && <Check className="mr-1 h-3 w-3" />}
      {labels[status]}
    </Badge>
  );
}
