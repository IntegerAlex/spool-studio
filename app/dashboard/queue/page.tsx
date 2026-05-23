'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Button } from '@/components/ui/button';
import { queueApi, assetsApi, clientsApi } from '@/lib/api-client';
import { UploadQueue, Asset, Client } from '@/types/index';
import { Download, Copy, Calendar, ExternalLink, Folder, FileText, RotateCcw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getAssetIcon } from '@/lib/asset-display';

function getQueueStatusLabel(status: UploadQueue['status']): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'scheduled':
      return 'Scheduled';
    case 'uploaded':
      return 'Uploaded';
    case 'failed':
      return 'Failed';
  }
}

function getQueueStatusClass(status: UploadQueue['status']): string {
  switch (status) {
    case 'pending':
    case 'scheduled':
      return 'border-[rgba(99,102,241,0.18)] bg-[rgba(99,102,241,0.12)] text-[#818cf8]';
    case 'uploaded':
      return 'border-[rgba(16,185,129,0.18)] bg-[rgba(16,185,129,0.12)] text-[#34d399]';
    case 'failed':
      return 'border-[rgba(239,68,68,0.22)] bg-[rgba(239,68,68,0.12)] text-[#fca5a5]';
  }
}

function getProgressWidth(status: UploadQueue['status']): string {
  switch (status) {
    case 'pending':
      return '22%';
    case 'scheduled':
      return '58%';
    case 'uploaded':
      return '100%';
    case 'failed':
      return '0%';
  }
}

export default function QueuePage() {
  const [queue, setQueue] = useState<UploadQueue[]>([]);
  const [assets, setAssets] = useState<Map<string, Asset>>(new Map());
  const [clients, setClients] = useState<Map<string, Client>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [queueData, assetsData, clientsData] = await Promise.all([
          queueApi.getAll(),
          assetsApi.getAll(),
          clientsApi.getAll(),
        ]);

        setQueue(queueData);
        setAssets(new Map(assetsData.map((a) => [a.id, a])));
        setClients(new Map(clientsData.map((c) => [c.id, c])));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCopyCaption = (caption: string) => {
    navigator.clipboard.writeText(caption);
  };

  const scheduledQueue = queue.filter((q) => q.status === 'scheduled').sort((a, b) =>
    new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );
  const queuedItems = [...queue].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Upload Queue' }]} />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Upload Queue' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[18px] font-medium text-white">Upload Queue</h1>
        <p className="text-[12px] text-[#71717a]">{scheduledQueue.length} scheduled next</p>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[#111111]">
        <div className="grid grid-cols-[1.6fr_0.9fr_0.8fr_0.9fr_120px] items-center gap-3 border-b border-[rgba(255,255,255,0.05)] px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-[#52525b]">
          <div>File</div>
          <div>Client</div>
          <div>Status</div>
          <div>Progress</div>
          <div className="text-right">Action</div>
        </div>

        <div className="divide-y divide-[rgba(255,255,255,0.05)]">
          {queuedItems.map((item) => {
          const asset = assets.get(item.assetId);
          const client = asset ? clients.get(asset.clientId) : null;
          const AssetIcon = asset ? getAssetIcon(asset) : FileText;
          const isFailed = item.status === 'failed';

          return (
            <div
              key={item.id}
              className={cn(
                'grid h-12 grid-cols-[1.6fr_0.9fr_0.8fr_0.9fr_120px] items-center gap-3 px-4 text-[13px] transition-colors hover:bg-[rgba(255,255,255,0.03)]',
                isFailed && 'border-l-2 border-l-[#ef4444] bg-[rgba(239,68,68,0.04)] hover:bg-[rgba(239,68,68,0.06)]'
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[rgba(255,255,255,0.04)] text-[#71717a]">
                  <AssetIcon className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{asset?.title || 'Unknown Asset'}</p>
                  <p className="truncate text-[12px] text-[#71717a]">
                    {item.caption || 'No caption provided'}
                  </p>
                </div>
              </div>

              <div className="min-w-0 text-[12px] text-[#a1a1aa]">
                <p className="truncate">{client?.name || 'Unknown Client'}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[#71717a]">
                  <Calendar className="h-3 w-3" />
                  {new Date(item.scheduledDate).toLocaleDateString()}
                </p>
              </div>

              <div>
                <span className={cn('inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-medium', getQueueStatusClass(item.status))}>
                  {getQueueStatusLabel(item.status)}
                </span>
              </div>

              <div className="pr-4">
                {item.status === 'uploaded' || item.status === 'failed' ? (
                  <p className={cn('text-[12px] font-medium', item.status === 'failed' ? 'text-[#fca5a5]' : 'text-[#34d399]')}>
                    {item.status === 'failed' ? 'Final state' : 'Complete'}
                  </p>
                ) : (
                  <div className="h-[3px] overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                    <div className="h-full rounded-full bg-[var(--primary)] transition-all duration-300" style={{ width: getProgressWidth(item.status) }} />
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[#a1a1aa] hover:bg-[rgba(255,255,255,0.06)] hover:text-white">
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border-[rgba(255,255,255,0.08)] bg-[#161616] text-white">
                    {asset?.driveFileUrl && (
                      <DropdownMenuItem asChild>
                        <a href={asset.driveFileUrl} target="_blank" rel="noreferrer" className="cursor-pointer hover:bg-[rgba(255,255,255,0.06)]">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open in Drive
                        </a>
                      </DropdownMenuItem>
                    )}
                    {asset?.driveFolderUrl && (
                      <DropdownMenuItem asChild>
                        <a href={asset.driveFolderUrl} target="_blank" rel="noreferrer" className="cursor-pointer hover:bg-[rgba(255,255,255,0.06)]">
                          <Folder className="mr-2 h-4 w-4" />
                          Open folder
                        </a>
                      </DropdownMenuItem>
                    )}
                    {asset?.driveFileUrl && (
                      <DropdownMenuItem
                        className="cursor-pointer hover:bg-[rgba(255,255,255,0.06)]"
                        onSelect={(e) => {
                          e.preventDefault();
                          void navigator.clipboard.writeText(asset.driveFileUrl ?? '');
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy link
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.08)]" />
                    <DropdownMenuItem className="cursor-pointer hover:bg-[rgba(255,255,255,0.06)]">
                      <Download className="mr-2 h-4 w-4" />
                      Download Asset
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer hover:bg-[rgba(255,255,255,0.06)]">
                      Edit Schedule
                    </DropdownMenuItem>
                    {isFailed && (
                      <DropdownMenuItem className="cursor-pointer text-[#fca5a5] hover:bg-[rgba(239,68,68,0.1)]">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Retry
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="cursor-pointer text-[#fca5a5] hover:bg-[rgba(239,68,68,0.1)]">
                      Cancel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
          })}
        </div>
      </div>

      {scheduledQueue.length === 0 && (
        <div className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[#161616] p-12 text-center">
          <p className="mb-4 text-[#a1a1aa]">No scheduled uploads</p>
          <p className="text-sm text-[#71717a]">Upload scheduling will appear here when assets are approved</p>
        </div>
      )}
    </div>
  );
}
