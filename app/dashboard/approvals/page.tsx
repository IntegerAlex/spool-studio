'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Button } from '@/components/ui/button';
import { assetsApi, clientsApi } from '@/lib/api-client';
import { Asset, Client } from '@/types/index';
import Link from 'next/link';
import { StatusBadge } from '@/components/assets/status-badge';
import { getAssetIcon } from '@/lib/asset-display';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function ApprovalsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [clients, setClients] = useState<Map<string, Client>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<Record<string, 'approve' | 'reject' | null>>({});
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const [assetsData, clientsData] = await Promise.all([
          assetsApi.getByStatuses(['draft', 'ready_for_review', 'revision_requested']),
          clientsApi.getAll(),
        ]);

        const clientMap = new Map(clientsData.map((c) => [c.id, c]));
        setClients(clientMap);
        setAssets(assetsData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load approvals';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const readyForReview = assets.filter((a) => a.status === 'draft' || a.status === 'ready_for_review');
  const revisionRequested = assets.filter((a) => a.status === 'revision_requested');

  const handleApprovalAction = async (assetId: string, action: 'approve' | 'reject') => {
    try {
      setPendingAction((prev) => ({ ...prev, [assetId]: action }));
      const response = await fetch(`/api/assets/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Request failed');
      }

      const updated = payload.data as Asset;
      setAssets((prev) => prev.map((asset) => (asset.id === updated.id ? updated : asset)));
      toast({
        title: action === 'approve' ? 'Asset approved' : 'Revision requested',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Approval failed';
      toast({
        title: action === 'approve' ? 'Approval failed' : 'Rejection failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setPendingAction((prev) => ({ ...prev, [assetId]: null }));
    }
  };

  const renderAssetRow = (asset: Asset, clientName: string, isPending: boolean) => {
    const AssetIcon = getAssetIcon(asset);
    const isApproving = pendingAction[asset.id] === 'approve';
    const isRejecting = pendingAction[asset.id] === 'reject';
    const isBusy = isApproving || isRejecting;

    return (
      <div key={asset.id} className="table-row-item">
        <Link href={`/dashboard/assets/${asset.id}`} className="flex flex-1 items-center gap-3 min-w-0">
          <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-[#0f0f0f]">
            {asset.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.thumbnailUrl} alt={asset.title} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <AssetIcon className="h-5 w-5 text-[var(--color-text-faint)]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--color-text-primary)]">{asset.title}</p>
            <p className="text-[11px] text-[var(--color-text-faint)] uppercase tracking-wider mt-0.5">{asset.fileExtension ?? asset.type}</p>
          </div>
        </Link>

        <div className="w-32 shrink-0 hidden sm:block">
          <StatusBadge status={asset.status} />
        </div>

        <div className="w-32 shrink-0 text-[var(--color-text-secondary)] truncate hidden md:block">
          {clientName}
        </div>

        {isPending ? (
          <div className="w-[120px] sm:w-48 shrink-0 flex items-center justify-end gap-2">
            <Button
              className="approve-btn"
              disabled={isBusy}
              aria-busy={isApproving}
              onClick={() => handleApprovalAction(asset.id, 'approve')}
            >
              {isApproving ? 'Approving…' : 'Approve'}
            </Button>
            <Button
              className="reject-btn"
              disabled={isBusy}
              aria-busy={isRejecting}
              onClick={() => handleApprovalAction(asset.id, 'reject')}
            >
              {isRejecting ? 'Rejecting…' : 'Reject'}
            </Button>
          </div>
        ) : (
          <div className="w-[120px] sm:w-48 shrink-0 text-right text-[var(--color-text-muted)] text-[12px]">
            Resolved
          </div>
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
    <div className="space-y-6 approvals-page-container" style={{ backgroundColor: 'var(--color-bg-app)', minHeight: '100vh', margin: '-24px', padding: '32px' }}>
      <style>{`
        .approvals-page-container {
          background-color: var(--color-bg-app);
          max-width: none !important;
        }
        .approvals-title {
          font-size: 20px !important;
          font-weight: 600 !important;
          color: var(--color-text-primary) !important;
          letter-spacing: -0.025em !important;
          line-height: 1.25 !important;
        }
        .approvals-subtitle {
          font-size: 12.5px !important;
          color: var(--color-text-muted) !important;
          margin-top: 3px !important;
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
        .approve-btn {
          background-color: transparent !important;
          border: 1px solid rgba(22,163,74,0.3) !important;
          color: #16a34a !important;
          font-size: 12px !important;
          border-radius: var(--radius-sm) !important;
          padding: 5px 12px !important;
          transition: all 120ms ease !important;
          height: auto !important;
          box-shadow: none !important;
          cursor: pointer !important;
        }
        .approve-btn:hover:not(:disabled) {
          background-color: rgba(22,163,74,0.08) !important;
        }
        .reject-btn {
          background-color: transparent !important;
          border: 1px solid rgba(248,113,113,0.3) !important;
          color: #f87171 !important;
          font-size: 12px !important;
          border-radius: var(--radius-sm) !important;
          padding: 5px 12px !important;
          transition: all 120ms ease !important;
          height: auto !important;
          box-shadow: none !important;
          cursor: pointer !important;
        }
        .reject-btn:hover:not(:disabled) {
          background-color: rgba(248,113,113,0.08) !important;
        }
      `}</style>

      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Approvals' }]} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="approvals-title">Approvals</h1>
          <p className="approvals-subtitle">Review, approve, or request revisions on client content drafts</p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
          <span>{readyForReview.length} pending</span>
          <span className="h-1 w-1 rounded-full bg-[var(--color-border-strong)]" />
          <span>{revisionRequested.length} revision requested</span>
        </div>
      </div>

      <div className="space-y-8">
        {/* Pending Approvals */}
        <div className="space-y-3">
          <h2 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider px-1">
            Drafts Pending Approval
          </h2>
          <div className="table-list-container">
            <div className="table-header-row">
              <div className="flex-1 header-cell">Asset</div>
              <div className="w-32 header-cell hidden sm:block">Status</div>
              <div className="w-32 header-cell hidden md:block">Client</div>
              <div className="w-[120px] sm:w-48 header-cell text-right">Actions</div>
            </div>
            <div>
              {readyForReview.length > 0 ? (
                readyForReview.map((asset) => {
                  const client = clients.get(asset.clientId);
                  return renderAssetRow(asset, client?.name || 'Unknown Client', true);
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <svg className="h-8 w-8 text-[var(--color-text-faint)] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-[13px] font-normal text-[var(--color-text-muted)]">No items pending approval</p>
                  <p className="text-[12px] text-[var(--color-text-faint)] mt-0.5">Everything is up to date</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Revision Requested */}
        <div className="space-y-3">
          <h2 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider px-1">
            Revision Requested
          </h2>
          <div className="table-list-container">
            <div className="table-header-row">
              <div className="flex-1 header-cell">Asset</div>
              <div className="w-32 header-cell hidden sm:block">Status</div>
              <div className="w-32 header-cell hidden md:block">Client</div>
              <div className="w-[120px] sm:w-48 header-cell text-right">Actions</div>
            </div>
            <div>
              {revisionRequested.length > 0 ? (
                revisionRequested.map((asset) => {
                  const client = clients.get(asset.clientId);
                  return renderAssetRow(asset, client?.name || 'Unknown Client', false);
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <svg className="h-8 w-8 text-[var(--color-text-faint)] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-[13px] font-normal text-[var(--color-text-muted)]">No resolved review items</p>
                  <p className="text-[12px] text-[var(--color-text-faint)] mt-0.5">No revisions are currently requested</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
