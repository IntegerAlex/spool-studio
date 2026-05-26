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
import Link from 'next/link';

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
      return 'border-[rgba(82,82,82,0.25)] bg-[rgba(82,82,82,0.15)] text-[#737373]';
    case 'scheduled':
      return 'border-[rgba(202,138,4,0.2)] bg-[rgba(202,138,4,0.1)] text-[#ca8a04]';
    case 'uploaded':
      return 'border-[rgba(22,163,74,0.2)] bg-[rgba(22,163,74,0.1)] text-[#16a34a]';
    case 'failed':
      return 'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.1)] text-[#fca5a5]';
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
    <div className="space-y-6 queue-page-container" style={{ backgroundColor: 'var(--color-bg-app)', minHeight: '100vh', margin: '-24px', padding: '32px' }}>
      <style>{`
        .queue-page-container {
          background-color: var(--color-bg-app);
          max-width: none !important;
        }
        .queue-title {
          font-size: 20px !important;
          font-weight: 600 !important;
          color: var(--color-text-primary) !important;
          letter-spacing: -0.025em !important;
          line-height: 1.25 !important;
        }
        .queue-subtitle {
          font-size: 12.5px !important;
          color: var(--color-text-muted) !important;
          margin-top: 3px !important;
        }
        .upload-drop-zone {
          background-color: var(--color-bg-surface) !important;
          border: 2px dashed var(--color-border) !important;
          border-radius: var(--radius-lg) !important;
          padding: 48px 32px !important;
          text-align: center !important;
          transition: border-color 150ms ease, background-color 150ms ease !important;
          cursor: pointer;
        }
        .upload-drop-zone:hover {
          border-color: var(--color-border-strong) !important;
          background-color: var(--color-bg-overlay) !important;
        }
        .upload-icon {
          width: 36px;
          height: 36px;
          color: var(--color-text-faint) !important;
        }
        .upload-zone-heading {
          font-size: 14px !important;
          font-weight: 500 !important;
          color: var(--color-text-primary) !important;
          margin-top: 12px !important;
        }
        .upload-zone-subtext {
          font-size: 12.5px !important;
          color: var(--color-text-muted) !important;
          margin-top: 4px !important;
        }
        .browse-btn {
          background: #3ecf8e !important;
          color: #000000 !important;
          font-size: 12.5px !important;
          font-weight: 600 !important;
          border-radius: var(--radius-sm) !important;
          padding: 8px 16px !important;
          border: none !important;
          cursor: pointer !important;
          box-shadow: none !important;
          transition: all 120ms ease !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: auto !important;
        }
        .browse-btn:hover {
          opacity: 0.88 !important;
        }
        .table-list-container {
          background-color: var(--color-bg-surface) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-lg) !important;
          overflow: hidden;
        }
        .table-header-row {
          background-color: var(--color-bg-overlay) !important;
          border-bottom: 1px solid var(--color-border) !important;
          padding: 10px 20px !important;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .header-cell {
          font-size: 11px !important;
          font-weight: 600 !important;
          letter-spacing: 0.07em !important;
          text-transform: uppercase !important;
          color: var(--color-text-faint) !important;
        }
        .table-row-item {
          padding: 12px 20px !important;
          border-bottom: 1px solid var(--color-border) !important;
          font-size: 13px !important;
          color: var(--color-text-secondary) !important;
          display: flex;
          align-items: center;
          gap: 16px;
          text-decoration: none !important;
          transition: background-color 100ms ease !important;
        }
        .table-row-item:last-child {
          border-bottom: none !important;
        }
        .table-row-item:hover {
          background-color: var(--color-bg-hover) !important;
        }
      `}</style>

      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Upload Queue' }]} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="queue-title">Upload Queue</h1>
          <p className="queue-subtitle">Monitor file publishing status and active uploads</p>
        </div>
        <p className="text-[12px] text-[var(--color-text-muted)] font-medium">{scheduledQueue.length} scheduled next</p>
      </div>

      <div className="upload-drop-zone">
        <svg className="upload-icon mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
        </svg>
        <h3 className="upload-zone-heading">Drag and drop files here to upload</h3>
        <p className="upload-zone-subtext">Supports MP4, MOV, PNG, JPG, and PDF (up to 100MB)</p>
        <button className="browse-btn mt-4">Browse Files</button>
      </div>

      <div className="table-list-container">
        <div className="table-header-row">
          <div className="flex-[1.6] min-w-0 header-cell">File</div>
          <div className="flex-[0.9] min-w-0 header-cell">Client</div>
          <div className="flex-[0.8] min-w-0 header-cell">Status</div>
          <div className="flex-[0.9] min-w-0 header-cell">Progress</div>
          <div className="w-[120px] shrink-0 text-right header-cell">Action</div>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {queuedItems.map((item) => {
            const asset = assets.get(item.assetId);
            const client = asset ? clients.get(asset.clientId) : null;
            const AssetIcon = asset ? getAssetIcon(asset) : FileText;
            const isFailed = item.status === 'failed';

            return (
              <div
                key={item.id}
                className={cn(
                  'table-row-item',
                  isFailed && 'border-l-2 border-l-[#ef4444] bg-[rgba(239,68,68,0.02)] hover:bg-[rgba(239,68,68,0.04)]'
                )}
              >
                <div className="flex flex-[1.6] min-w-0 items-center gap-3">
                  <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-[#0f0f0f]">
                    {asset?.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.thumbnailUrl} alt={asset.title} className="h-full w-full object-cover" />
                    ) : (
                      <AssetIcon className="h-5 w-5 text-[var(--color-text-faint)]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--color-text-primary)]">{asset?.title || 'Unknown Asset'}</p>
                    <p className="truncate text-[12px] text-[var(--color-text-muted)] mt-0.5">
                      {item.caption || 'No caption provided'}
                    </p>
                  </div>
                </div>

                <div className="flex-[0.9] min-w-0 text-[12px] text-[var(--color-text-secondary)]">
                  <p className="truncate">{client?.name || 'Unknown Client'}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[var(--color-text-faint)]">
                    <Calendar className="h-3 w-3" />
                    {new Date(item.scheduledDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex-[0.8] min-w-0">
                  <span className={cn('inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-medium capitalize', getQueueStatusClass(item.status))}>
                    {getQueueStatusLabel(item.status)}
                  </span>
                </div>

                <div className="flex-[0.9] min-w-0 pr-4">
                  {item.status === 'uploaded' || item.status === 'failed' ? (
                    <p className={cn('text-[12px] font-medium', item.status === 'failed' ? 'text-[#fca5a5]' : 'text-[#34d399]')}>
                      {item.status === 'failed' ? 'Final state' : 'Complete'}
                    </p>
                  ) : (
                    <div className="h-[3px] overflow-hidden rounded-full bg-[var(--color-bg-overlay)]">
                      <div className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300" style={{ width: getProgressWidth(item.status) }} />
                    </div>
                  )}
                </div>

                <div className="w-[120px] shrink-0 flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-white">
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="border-[var(--color-border)] bg-[var(--color-bg-surface)] text-white">
                      {asset?.driveFileUrl && (
                        <DropdownMenuItem asChild>
                          <a href={asset.driveFileUrl} target="_blank" rel="noreferrer" className="cursor-pointer hover:bg-[var(--color-bg-hover)]">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open in Drive
                          </a>
                        </DropdownMenuItem>
                      )}
                      {asset?.driveFolderUrl && (
                        <DropdownMenuItem asChild>
                          <a href={asset.driveFolderUrl} target="_blank" rel="noreferrer" className="cursor-pointer hover:bg-[var(--color-bg-hover)]">
                            <Folder className="mr-2 h-4 w-4" />
                            Open folder
                          </a>
                        </DropdownMenuItem>
                      )}
                      {asset?.driveFileUrl && (
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-[var(--color-bg-hover)]"
                          onSelect={(e) => {
                            e.preventDefault();
                            void navigator.clipboard.writeText(asset.driveFileUrl ?? '');
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy link
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-[var(--color-border)]" />
                      <DropdownMenuItem className="cursor-pointer hover:bg-[var(--color-bg-hover)]">
                        <Download className="mr-2 h-4 w-4" />
                        Download Asset
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer hover:bg-[var(--color-bg-hover)]">
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
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="h-8 w-8 text-[var(--color-text-faint)] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-[13px] font-normal text-[var(--color-text-muted)]">No scheduled uploads</p>
          <p className="text-[12px] text-[var(--color-text-faint)] mt-0.5">Upload scheduling will appear here when assets are approved</p>
        </div>
      )}
    </div>
  );
}
