'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { assetsApi, clientsApi, dashboardApi } from '@/lib/api-client';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';
import { Asset, Client } from '@/types/index';
import { AssetFormDialog } from '@/components/assets/asset-form-dialog';
import {
  ArrowUpRight,
  AlertCircle,
  Clock3,
  FileText,
  FolderPlus,
  KanbanSquare,
  Upload,
  CheckCircle2,
  Users,
  FileWarning,
  LayoutGrid,
  Plus,
  Film,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';

type TrendDirection = 'up' | 'down' | 'neutral';

type DashboardStatCard = {
  title: string;
  value: string;
  trendLabel: string;
  trendDirection: TrendDirection;
  icon: React.ReactNode;
  iconBgClassName: string;
};

type ActivityRow = {
  id: string;
  asset: Asset;
  action: string;
  timestamp: string;
  icon: React.ReactNode;
  iconBgClassName: string;
};

function getActivityAction(asset: Asset): string {
  if (asset.status === 'revision_requested') {
    return 'revision requested';
  }
  if (asset.status === 'ready_for_review') {
    return 'awaiting approval';
  }
  if (asset.status === 'approved') {
    return 'approved for publish';
  }
  if (asset.status === 'published') {
    return 'published';
  }
  if (asset.status === 'failed') {
    return 'upload failed';
  }

  return 'updated';
}

function getActivityIcon(asset: Asset): React.ReactNode {
  if (asset.status === 'revision_requested') {
    return <FileWarning className="h-4 w-4 text-[#f59e0b]" />;
  }
  if (asset.status === 'ready_for_review') {
    return <Clock3 className="h-4 w-4 text-[#f59e0b]" />;
  }
  if (asset.status === 'approved') {
    return <Upload className="h-4 w-4 text-[#10b981]" />;
  }
  if (asset.status === 'published') {
    return <CheckCircle2 className="h-4 w-4 text-[#10b981]" />;
  }
  if (asset.status === 'failed') {
    return <AlertCircle className="h-4 w-4 text-[#ef4444]" />;
  }
  if (asset.type === 'reel') {
    return <Film className="h-4 w-4 text-[#6366f1]" />;
  }
  if (asset.type === 'poster') {
    return <ImageIcon className="h-4 w-4 text-[#10b981]" />;
  }

  return <FileText className="h-4 w-4 text-[#3b82f6]" />;
}

function getActivityBg(asset: Asset): string {
  if (asset.status === 'revision_requested') {
    return 'bg-[rgba(245,158,11,0.14)]';
  }
  if (asset.status === 'ready_for_review') {
    return 'bg-[rgba(245,158,11,0.14)]';
  }
  if (asset.status === 'approved') {
    return 'bg-[rgba(16,185,129,0.14)]';
  }
  if (asset.status === 'published') {
    return 'bg-[rgba(16,185,129,0.14)]';
  }
  if (asset.status === 'failed') {
    return 'bg-[rgba(239,68,68,0.14)]';
  }
  if (asset.type === 'reel') {
    return 'bg-[rgba(99,102,241,0.14)]';
  }
  if (asset.type === 'poster') {
    return 'bg-[rgba(16,185,129,0.14)]';
  }

  return 'bg-[rgba(59,130,246,0.14)]';
}

function getStatIcon(title: string): React.ReactNode {
  switch (title) {
    case 'Total Assets':
      return <LayoutGrid className="h-5 w-5 text-[#6366f1]" />;
    case 'Total Clients':
      return <Users className="h-5 w-5 text-[#10b981]" />;
    case 'Pending Approvals':
      return <Clock3 className="h-5 w-5 text-[#f59e0b]" />;
    case 'Approved Assets':
      return <CheckCircle2 className="h-5 w-5 text-[#10b981]" />;
    default:
      return <Sparkles className="h-5 w-5 text-[#6366f1]" />;
  }
}

function getStatBg(title: string): string {
  switch (title) {
    case 'Total Assets':
      return 'bg-[rgba(99,102,241,0.12)]';
    case 'Total Clients':
      return 'bg-[rgba(16,185,129,0.12)]';
    case 'Pending Approvals':
      return 'bg-[rgba(245,158,11,0.12)]';
    case 'Approved Assets':
      return 'bg-[rgba(16,185,129,0.12)]';
    default:
      return 'bg-[rgba(99,102,241,0.12)]';
  }
}

function getTrendClass(direction: TrendDirection): string {
  if (direction === 'up') {
    return 'bg-[rgba(16,185,129,0.14)] text-[#10b981]';
  }
  if (direction === 'down') {
    return 'bg-[rgba(239,68,68,0.14)] text-[#ef4444]';
  }
  return 'bg-[rgba(255,255,255,0.06)] text-[#a1a1aa]';
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'CO';
}

export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [summary, setSummary] = useState({
    pendingApprovals: 0,
    upcomingUploads: 0,
    totalClients: 0,
    uploadedThisMonth: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      try {
        setError(null);
        const [assetsData, clientsData, summaryData] = await Promise.all([
          assetsApi.getAll(),
          clientsApi.getAll(),
          dashboardApi.getSummary(),
        ]);
        if (!isActive) {
          return;
        }
        setAssets(assetsData);
        setClients(clientsData);
        setSummary(summaryData);
      } catch (err) {
        if (!isActive) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Failed to load dashboard';
        logProductionRuntimeError('dashboard-loader', err, {
          pathname: '/dashboard',
        });
        setAssets([]);
        setClients([]);
        setSummary({
          pendingApprovals: 0,
          upcomingUploads: 0,
          totalClients: 0,
          uploadedThisMonth: 0,
        });
        setError(message);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isActive = false;
    };
  }, []);

  const pendingApprovals = summary.pendingApprovals;
  const upcomingUploads = summary.upcomingUploads;
  const totalClients = summary.totalClients;
  const completedThisMonth = summary.uploadedThisMonth;
  const approvedAssets = assets.filter((asset) => asset.status === 'approved').length;
  const totalAssets = assets.length;

  const recentActivity = useMemo<ActivityRow[]>(() => {
    return [...assets]
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, 5)
      .map((asset) => ({
        id: asset.id,
        asset,
        action: getActivityAction(asset),
        timestamp: asset.updatedAt.toLocaleString([], {
          hour: 'numeric',
          minute: '2-digit',
        }),
        icon: getActivityIcon(asset),
        iconBgClassName: getActivityBg(asset),
      }));
  }, [assets]);

  const statCards = useMemo<DashboardStatCard[]>(
    () => [
      {
        title: 'Total Assets',
        value: totalAssets.toString(),
        trendLabel: '+12% this week',
        trendDirection: 'up',
        icon: getStatIcon('Total Assets'),
        iconBgClassName: getStatBg('Total Assets'),
      },
      {
        title: 'Total Clients',
        value: totalClients.toString(),
        trendLabel: '+3 active this month',
        trendDirection: 'up',
        icon: getStatIcon('Total Clients'),
        iconBgClassName: getStatBg('Total Clients'),
      },
      {
        title: 'Pending Approvals',
        value: pendingApprovals.toString(),
        trendLabel: pendingApprovals > 0 ? 'Needs attention' : 'All caught up',
        trendDirection: pendingApprovals > 0 ? 'down' : 'neutral',
        icon: getStatIcon('Pending Approvals'),
        iconBgClassName: getStatBg('Pending Approvals'),
      },
      {
        title: 'Approved Assets',
        value: approvedAssets.toString(),
        trendLabel: approvedAssets > 0 ? `${approvedAssets} approved` : 'No approved assets',
        trendDirection: 'neutral',
        icon: getStatIcon('Approved Assets'),
        iconBgClassName: getStatBg('Approved Assets'),
      },
    ],
    [approvedAssets, pendingApprovals, totalAssets, totalClients]
  );

  const quickActionItems = [
    {
      label: 'New Asset',
      icon: <Plus className="h-4 w-4" />,
      accent: true,
      trigger: (
        <AssetFormDialog
          mode="create"
          onSaved={(asset) => {
            setAssets((prev) => [asset, ...prev]);
            dashboardApi.getSummary().then(setSummary).catch(() => undefined);
          }}
          trigger={
            <Button className="h-9 rounded-md border border-[rgba(255,255,255,0.1)] bg-transparent px-3 text-[13px] font-medium text-white shadow-none hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white">
              <Plus className="mr-2 h-4 w-4" />
              New Asset
            </Button>
          }
        />
      ),
    },
    {
      label: 'Upload Files',
      icon: <Upload className="h-4 w-4" />,
      href: '/dashboard/assets',
    },
    {
      label: 'Add Client',
      icon: <FolderPlus className="h-4 w-4" />,
      href: '/dashboard/clients',
    },
    {
      label: 'View Kanban',
      icon: <KanbanSquare className="h-4 w-4" />,
      href: '/dashboard/kanban',
    },
  ] as const;

  const clientChips = useMemo(() => {
    return clients.slice(0, 10);
  }, [clients]);

  const assetStatusBreakdown = useMemo(
    () => [
      { label: 'Draft', count: assets.filter((a) => a.status === 'draft').length },
      { label: 'Revision', count: assets.filter((a) => a.status === 'revision_requested').length },
      { label: 'Approved', count: assets.filter((a) => a.status === 'approved').length },
      { label: 'Published', count: assets.filter((a) => a.status === 'published').length },
    ],
    [assets]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[18px] font-medium text-white">Dashboard</h1>
          <div className="mt-1 text-[12px] text-[#71717a]">Dashboard</div>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[18px] font-medium text-white">Dashboard</h1>
          <div className="mt-1 text-[12px] text-[#71717a]">Dashboard</div>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 dashboard-container" style={{ backgroundColor: 'var(--color-bg-app)', minHeight: '100vh', margin: '-24px', padding: '32px' }}>
      <style>{`
        .dashboard-container {
          background-color: var(--color-bg-app);
          max-width: none !important;
        }
        header .topbar-breadcrumb {
          display: none !important;
        }
        .page-title {
          font-size: 20px !important;
          font-weight: 600 !important;
          color: var(--color-text-primary) !important;
          letter-spacing: -0.025em !important;
        }
        .breadcrumb-text {
          font-size: 12.5px !important;
          color: var(--color-text-muted) !important;
        }
        .new-asset-btn {
          background: var(--color-accent) !important;
          color: #000000 !important;
          font-size: 12.5px !important;
          font-weight: 600 !important;
          border-radius: var(--radius-sm) !important;
          padding: 8px 16px !important;
          border: none !important;
          cursor: pointer !important;
          letter-spacing: 0.01em !important;
          box-shadow: none !important;
          transition: all 120ms ease !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .new-asset-btn:hover {
          opacity: 0.88 !important;
          transform: translateY(-1px) !important;
          filter: none !important;
        }
        .new-asset-btn:active {
          transform: translateY(0) !important;
          opacity: 1 !important;
        }
        .stat-card {
          background-color: var(--color-bg-surface) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-lg) !important;
          padding: 20px 22px !important;
          transition: border-color 150ms ease !important;
          position: relative;
          overflow: hidden;
          box-shadow: none !important;
        }
        .stat-card:hover {
          border-color: var(--color-border-strong) !important;
        }
        .stat-card-label {
          font-size: 11px !important;
          font-weight: 500 !important;
          letter-spacing: 0.06em !important;
          color: var(--color-text-muted) !important;
          text-transform: uppercase !important;
        }
        .stat-card-number {
          font-size: 28px !important;
          font-weight: 600 !important;
          color: var(--color-text-primary) !important;
          letter-spacing: -0.03em !important;
          line-height: 1.1 !important;
          margin-top: 6px !important;
        }
        .stat-trend-text {
          font-size: 11.5px !important;
          color: var(--color-text-muted) !important;
          margin-top: 6px !important;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .stat-card-icon-container {
          width: 28px !important;
          height: 28px !important;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent !important;
          flex-shrink: 0;
        }
        .stat-card-icon {
          width: 14px !important;
          height: 14px !important;
          color: var(--color-text-faint) !important;
        }
        .quick-action-row {
          background-color: var(--color-bg-surface) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-lg) !important;
          padding: 14px 20px !important;
          box-shadow: none !important;
        }
        .quick-action-btn {
          background-color: transparent !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-sm) !important;
          padding: 7px 14px !important;
          font-size: 12.5px !important;
          color: var(--color-text-muted) !important;
          gap: 7px !important;
          transition: all 120ms ease !important;
          height: auto !important;
        }
        .quick-action-btn:hover {
          background-color: var(--color-bg-hover) !important;
          border-color: var(--color-border-strong) !important;
          color: var(--color-text-secondary) !important;
        }
        .quick-action-icon {
          width: 13px !important;
          height: 13px !important;
          color: inherit !important;
        }
        .content-panel {
          background-color: var(--color-bg-surface) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-lg) !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .panel-header {
          padding: 16px 20px !important;
          border-bottom: 1px solid var(--color-border) !important;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .panel-title {
          font-size: 13px !important;
          font-weight: 500 !important;
          color: var(--color-text-primary) !important;
        }
        .panel-link {
          font-size: 12px !important;
          color: var(--color-text-muted) !important;
          text-decoration: none !important;
          transition: color 120ms ease !important;
        }
        .panel-link:hover {
          color: var(--color-text-primary) !important;
          text-decoration: underline !important;
        }
        .empty-state {
          padding: 48px 20px !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px !important;
        }
        .breakdown-row {
          padding: 11px 20px !important;
          border-bottom: 1px solid var(--color-border) !important;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .breakdown-row:last-child {
          border-bottom: none !important;
        }
        .breakdown-label-container {
          display: flex;
          align-items: center;
          gap: 9px !important;
        }
        .breakdown-dot {
          width: 6px !important;
          height: 6px !important;
          border-radius: 50% !important;
        }
        .breakdown-label {
          font-size: 13px !important;
          color: var(--color-text-secondary) !important;
        }
        .breakdown-number {
          font-size: 13px !important;
          font-weight: 500 !important;
          color: var(--color-text-primary) !important;
        }
        .section-heading-container {
          padding-top: 28px !important;
          margin-bottom: 14px !important;
        }
        .section-heading {
          font-size: 14px !important;
          font-weight: 500 !important;
          color: var(--color-text-primary) !important;
        }
        .section-sublabel {
          font-size: 12.5px !important;
          color: var(--color-text-muted) !important;
          margin-top: 2px !important;
        }
        .client-chip {
          background-color: var(--color-bg-surface) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-md) !important;
          padding: 6px 14px !important;
          display: inline-flex !important;
          align-items: center;
          gap: 8px !important;
          transition: all 120ms ease !important;
          height: auto !important;
        }
        .client-chip:hover {
          border-color: var(--color-border-strong) !important;
          background-color: var(--color-bg-hover) !important;
        }
        .client-chip-name {
          font-size: 13px !important;
          font-weight: 500 !important;
          color: var(--color-text-primary) !important;
        }
        .client-chip-badge {
          font-size: 11.5px !important;
          color: var(--color-text-muted) !important;
          background-color: var(--color-bg-overlay) !important;
          border-radius: 4px !important;
          padding: 2px 7px !important;
          font-weight: 400 !important;
        }
      `}</style>

      <div className="space-y-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="mt-1 breadcrumb-text">
              Dashboard
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <AssetFormDialog
              mode="create"
              onSaved={(asset) => {
                setAssets((prev) => [asset, ...prev]);
                dashboardApi.getSummary().then(setSummary).catch(() => undefined);
              }}
              trigger={
                <Button className="new-asset-btn">
                  <Plus className="mr-2 h-4 w-4" />
                  New Asset
                </Button>
              }
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => (
          <Card key={card.title} className="stat-card">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="stat-card-label">{card.title}</p>
                <p className="stat-card-number">{card.value}</p>
                <div className="stat-trend-text">
                  {card.trendDirection === 'up' ? (
                    <span style={{ color: '#3ecf8e' }}>↑</span>
                  ) : card.trendDirection === 'down' ? (
                    <span style={{ color: '#f87171' }}>↓</span>
                  ) : null}
                  <span>{card.trendLabel}</span>
                </div>
              </div>
              <div className="stat-card-icon-container">
                {React.isValidElement(card.icon) && React.cloneElement(card.icon as React.ReactElement<any>, {
                  className: 'stat-card-icon',
                })}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="quick-action-row">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <AssetFormDialog
            mode="create"
            onSaved={(asset) => {
              setAssets((prev) => [asset, ...prev]);
              dashboardApi.getSummary().then(setSummary).catch(() => undefined);
            }}
            trigger={
              <Button className="quick-action-btn flex items-center">
                <Plus className="quick-action-icon" />
                <span>New Asset</span>
              </Button>
            }
          />

          <Button asChild variant="ghost" className="quick-action-btn flex items-center">
            <Link href="/dashboard/assets">
              <Upload className="quick-action-icon" />
              <span>Upload Files</span>
            </Link>
          </Button>

          <Button asChild variant="ghost" className="quick-action-btn flex items-center">
            <Link href="/dashboard/clients">
              <FolderPlus className="quick-action-icon" />
              <span>Add Client</span>
            </Link>
          </Button>

          <Button asChild variant="ghost" className="quick-action-btn flex items-center">
            <Link href="/dashboard/kanban">
              <KanbanSquare className="quick-action-icon" />
              <span>View Kanban</span>
            </Link>
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="content-panel xl:col-span-2">
          <div className="panel-header">
            <h3 className="panel-title">Recent Activity</h3>
            <Link href="/dashboard/assets" className="panel-link">
              View all
            </Link>
          </div>

          <div className="space-y-1 p-2">
            {recentActivity.length > 0 ? (
              recentActivity.map((item, index) => (
                <Link
                  key={item.id}
                  href={`/dashboard/assets/${item.asset.id}`}
                  className="relative flex h-10 items-center justify-between rounded-md px-3 text-sm transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.iconBgClassName}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-white">{item.asset.title}</p>
                      <p className="truncate text-[12px] text-[#a1a1aa]">
                        {item.action} • {item.asset.type} asset
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 text-[12px] text-[#71717a]">{item.timestamp}</span>

                  {index < recentActivity.length - 1 && (
                    <div className="absolute inset-x-3 bottom-0 h-px bg-[rgba(255,255,255,0.05)]" aria-hidden="true" />
                  )}
                </Link>
              ))
            ) : (
              <div className="empty-state">
                <svg className="h-8 w-8 text-[var(--color-text-faint)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-[13px] font-normal text-[var(--color-text-muted)]">No recent activity yet</p>
                <p className="text-[12px] text-[var(--color-text-faint)]">Activity from your team will appear here</p>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="content-panel">
            <div className="panel-header">
              <h3 className="panel-title">Asset Status Breakdown</h3>
            </div>

            <div className="mt-0 space-y-0">
              {assetStatusBreakdown.map((status) => {
                let dotColor = '#525252';
                if (status.label === 'Revision') dotColor = '#ca8a04';
                else if (status.label === 'Approved') dotColor = '#16a34a';
                else if (status.label === 'Published') dotColor = '#3b82f6';

                return (
                  <div key={status.label} className="breakdown-row">
                    <div className="breakdown-label-container">
                      <div className="breakdown-dot" style={{ backgroundColor: dotColor }} />
                      <span className="breakdown-label">{status.label}</span>
                    </div>
                    <span className="breakdown-number">{status.count}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className="section-heading-container">
        <h3 className="section-heading">Clients</h3>
        <p className="section-sublabel">Quick access to active client workspaces</p>
      </div>

      <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
        {clientChips.map((client) => (
          <Link
            key={client.id}
            href={`/dashboard/clients/${client.id}`}
            className="client-chip"
          >
            <span className="client-chip-name max-w-[10rem] truncate">{client.name}</span>
            <span className="client-chip-badge">
              {client.completedDeliverables}/{client.monthlyDeliverables}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
