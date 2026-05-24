'use client';

import { useEffect, useMemo, useState } from 'react';
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
  if (asset.status === 'failed') {
    return 'failed upload';
  }
  if (asset.status === 'revision_requested') {
    return 'needs review';
  }
  if (asset.status === 'approved') {
    return 'approved';
  }
  if (asset.status === 'scheduled') {
    return 'scheduled';
  }

  return 'updated';
}

function getActivityIcon(asset: Asset): React.ReactNode {
  if (asset.status === 'failed') {
    return <AlertCircle className="h-4 w-4 text-[#ef4444]" />;
  }
  if (asset.status === 'revision_requested') {
    return <FileWarning className="h-4 w-4 text-[#f59e0b]" />;
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
  if (asset.status === 'failed') {
    return 'bg-[rgba(239,68,68,0.14)]';
  }
  if (asset.status === 'revision_requested') {
    return 'bg-[rgba(245,158,11,0.14)]';
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
    case 'Failed Uploads':
      return <AlertCircle className="h-5 w-5 text-[#ef4444]" />;
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
    case 'Failed Uploads':
      return 'bg-[rgba(239,68,68,0.12)]';
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
  const failedUploads = assets.filter((asset) => asset.status === 'failed').length;
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
        title: 'Failed Uploads',
        value: failedUploads.toString(),
        trendLabel: failedUploads > 0 ? 'Investigate errors' : 'No failures',
        trendDirection: failedUploads > 0 ? 'down' : 'neutral',
        icon: getStatIcon('Failed Uploads'),
        iconBgClassName: getStatBg('Failed Uploads'),
      },
    ],
    [failedUploads, pendingApprovals, totalAssets, totalClients]
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
      { label: 'In Review', count: assets.filter((a) => a.status === 'ready_for_review').length },
      { label: 'Approved', count: assets.filter((a) => a.status === 'approved').length },
      { label: 'Scheduled', count: assets.filter((a) => a.status === 'scheduled').length },
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
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[18px] font-medium text-white sm:text-[20px]">Dashboard</h1>
            <p className="mt-1 text-[12px] text-[#71717a]">
              <span className="text-[#a1a1aa]">Dashboard</span>
              <span className="mx-2 text-[#52525b]">&gt;</span>
              <span>Home</span>
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button className="h-10 w-full rounded-md border border-[rgba(255,255,255,0.1)] bg-[var(--primary)] px-4 text-[13px] font-medium text-white shadow-none hover:bg-[#4f46e5] sm:h-9 sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Asset
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#161616] px-5 py-4 shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#71717a]">{card.title}</p>
                <p className="mt-2 text-[24px] font-medium leading-none text-white sm:text-[28px]">{card.value}</p>
                <div className={`mt-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${getTrendClass(card.trendDirection)}`}>
                  {card.trendDirection === 'up' ? <ArrowUpRight className="mr-1 h-3 w-3" /> : null}
                  {card.trendLabel}
                </div>
              </div>
              <div className={`flex h-8 w-8 items-center justify-center rounded-md ${card.iconBgClassName}`}>
                {card.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="rounded-[10px] border-0 bg-[#161616] p-4 shadow-none">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <AssetFormDialog
            mode="create"
            onSaved={(asset) => {
              setAssets((prev) => [asset, ...prev]);
              dashboardApi.getSummary().then(setSummary).catch(() => undefined);
            }}
            trigger={
              <Button className="h-10 w-full rounded-md border border-[rgba(255,255,255,0.1)] bg-transparent px-3 text-[13px] font-medium text-white shadow-none hover:border-[#6366f1] hover:bg-[rgba(255,255,255,0.06)] hover:text-white sm:h-9 sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                New Asset
              </Button>
            }
          />

          <Button asChild variant="ghost" className="h-10 w-full rounded-md border border-[rgba(255,255,255,0.1)] bg-transparent px-3 text-[13px] font-medium text-white shadow-none hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white sm:h-9 sm:w-auto">
            <Link href="/dashboard/assets">
              <Upload className="mr-2 h-4 w-4" />
              Upload Files
            </Link>
          </Button>

          <Button asChild variant="ghost" className="h-10 w-full rounded-md border border-[rgba(255,255,255,0.1)] bg-transparent px-3 text-[13px] font-medium text-white shadow-none hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white sm:h-9 sm:w-auto">
            <Link href="/dashboard/clients">
              <FolderPlus className="mr-2 h-4 w-4" />
              Add Client
            </Link>
          </Button>

          <Button asChild variant="ghost" className="h-10 w-full rounded-md border border-[rgba(255,255,255,0.1)] bg-transparent px-3 text-[13px] font-medium text-white shadow-none hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white sm:h-9 sm:w-auto">
            <Link href="/dashboard/kanban">
              <KanbanSquare className="mr-2 h-4 w-4" />
              View Kanban
            </Link>
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="rounded-[10px] border-0 bg-[#161616] p-0 shadow-none xl:col-span-2">
          <div className="flex items-center justify-between px-5 py-4">
            <h3 className="text-[13px] font-medium text-white">Recent Activity</h3>
            <Link href="/dashboard/assets" className="text-[13px] font-medium text-[var(--primary)] hover:text-[#818cf8]">
              View all
            </Link>
          </div>

          <div className="px-2 pb-2">
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
              <div className="px-5 py-8 text-[13px] text-[#71717a]">No recent activity yet.</div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[10px] border-0 bg-[#161616] p-5 shadow-none">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-medium text-white">Asset Status Breakdown</h3>
            </div>

            <div className="mt-4 space-y-2">
              {assetStatusBreakdown.map((status) => (
                <div
                  key={status.label}
                  className="flex h-9 items-center justify-between rounded-md px-3 text-[13px] transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                >
                  <span className="text-[#a1a1aa]">{status.label}</span>
                  <span className="font-medium text-white">{status.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="rounded-[10px] border-0 bg-[#161616] p-5 shadow-none">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-[13px] font-medium text-white">Clients</h3>
            <p className="mt-1 text-[12px] text-[#71717a]">Quick access to active client workspaces.</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {clientChips.map((client) => (
            <Link
              key={client.id}
              href={`/dashboard/clients/${client.id}`}
              className="inline-flex h-7 shrink-0 items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 text-[13px] text-white transition-colors hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.06)]"
            >
              <span className="max-w-[10rem] truncate">{client.name}</span>
              <span className="rounded-full bg-[rgba(99,102,241,0.14)] px-2 py-0.5 text-[11px] font-medium text-[#818cf8]">
                {client.completedDeliverables}/{client.monthlyDeliverables}
              </span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
