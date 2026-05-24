'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Button } from '@/components/ui/button';
import { assetsApi, clientsApi } from '@/lib/api-client';
import { Asset, Client } from '@/types/index';
import Link from 'next/link';
import { CheckCircle, XCircle, Clock, Image as ImageIcon } from 'lucide-react';
import { StatusBadge } from '@/components/assets/status-badge';
import { getAssetIcon } from '@/lib/asset-display';
import { cn } from '@/lib/utils';

export default function ApprovalsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [clients, setClients] = useState<Map<string, Client>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const [assetsData, clientsData] = await Promise.all([
          assetsApi.getAll(),
          clientsApi.getAll(),
        ]);

        const clientMap = new Map(clientsData.map((c) => [c.id, c]));
        setClients(clientMap);

        const approvalsAssets = assetsData.filter(
          (a) => a.status === 'ready_for_review' || a.status === 'revision_requested'
        );
        setAssets(approvalsAssets);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load approvals';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const readyForReview = assets.filter((a) => a.status === 'ready_for_review');
  const revisionRequested = assets.filter((a) => a.status === 'revision_requested');

  const renderAssetRow = (asset: Asset, clientName: string, isPending: boolean) => {
    const AssetIcon = getAssetIcon(asset);

    return (
      <div key={asset.id} className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-[rgba(255,255,255,0.03)] sm:flex-row sm:items-center">
        <Link href={`/dashboard/assets/${asset.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-[rgba(255,255,255,0.06)] bg-[#0f0f0f]">
            {asset.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.thumbnailUrl} alt={asset.title} className="h-full w-full object-cover" />
            ) : (
              <AssetIcon className="h-5 w-5 text-[#71717a]" />
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-white">{asset.title}</p>
            <p className="truncate text-[12px] text-[#71717a]">{clientName}</p>
          </div>
        </Link>

        <div className="shrink-0 self-start sm:self-auto">
          <StatusBadge status={asset.status} />
        </div>

        {isPending ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full border border-[rgba(16,185,129,0.2)] bg-transparent px-3 text-[12px] text-[#34d399] hover:bg-[rgba(16,185,129,0.1)] hover:text-[#34d399] sm:w-auto"
            >
              Approve
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full border border-[rgba(239,68,68,0.2)] bg-transparent px-3 text-[12px] text-[#fca5a5] hover:bg-[rgba(239,68,68,0.1)] hover:text-[#fca5a5] sm:w-auto"
            >
              Reject
            </Button>
          </div>
        ) : (
          <div className="shrink-0 text-[12px] text-[#71717a]">Resolved</div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Approvals' }]} />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading approvals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Approvals' }]} />
        <div className="text-center py-12">
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Approvals' }]} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[18px] font-medium text-white">Approvals</h1>
        <div className="flex items-center gap-2 text-[12px] text-[#71717a]">
          <span>{readyForReview.length} pending</span>
          <span className="h-1 w-1 rounded-full bg-[rgba(255,255,255,0.2)]" />
          <span>{revisionRequested.length} resolved</span>
        </div>
      </div>

      <div className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[#111111]">
        <div className="border-b border-[rgba(255,255,255,0.05)] px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-[#52525b]">
          Pending
        </div>
        <div className="divide-y divide-[rgba(255,255,255,0.05)]">
          {readyForReview.length > 0 ? (
            readyForReview.map((asset) => {
              const client = clients.get(asset.clientId);
              return renderAssetRow(asset, client?.name || 'Unknown Client', true);
            })
          ) : (
            <div className="px-4 py-10 text-center text-[13px] text-[#71717a]">No items pending approval</div>
          )}
        </div>

        <div className="border-t border-[rgba(255,255,255,0.05)] px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-[#52525b]">
          Resolved
        </div>
        <div className="divide-y divide-[rgba(255,255,255,0.05)]">
          {revisionRequested.length > 0 ? (
            revisionRequested.map((asset) => {
              const client = clients.get(asset.clientId);
              return renderAssetRow(asset, client?.name || 'Unknown Client', false);
            })
          ) : (
            <div className="px-4 py-10 text-center text-[13px] text-[#71717a]">No resolved review items</div>
          )}
        </div>
      </div>
    </div>
  );
}
