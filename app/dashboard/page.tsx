'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import ErrorBoundary from '@/components/ui/error-boundary';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { clientsApi, dashboardApi, assetsApi } from '@/lib/api-client';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';
import { Client } from '@/types/index';
import { AssetFormDialog } from '@/components/assets/asset-form-dialog';
import {
  Clock3,
  FolderPlus,
  KanbanSquare,
  Upload,
  CheckCircle2,
  Users,
  FileWarning,
  LayoutGrid,
  Plus,
  Sparkles,
} from 'lucide-react';

type TrendDirection = 'up' | 'down' | 'neutral';

type DashboardSummary = Awaited<ReturnType<typeof dashboardApi.getSummary>>;

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
  kind: DashboardSummary['recentActivity'][number]['kind'];
  href: string;
  title: string;
  detail: string;
  timestamp: Date;
  iconKind: DashboardSummary['recentActivity'][number]['iconKind'];
  icon: React.ReactNode;
  iconBgClassName: string;
};

function getActivityIcon(entry: DashboardSummary['recentActivity'][number]): React.ReactNode {
  if (entry.iconKind === 'client') {
    return <Users className="h-4 w-4 text-[#10b981]" />;
  }
  if (entry.iconKind === 'revision') {
    return <FileWarning className="h-4 w-4 text-[#f59e0b]" />;
  }
  if (entry.iconKind === 'approval') {
    return <CheckCircle2 className="h-4 w-4 text-[#10b981]" />;
  }
  if (entry.iconKind === 'upload') {
    return <Upload className="h-4 w-4 text-[#3b82f6]" />;
  }

  return <Clock3 className="h-4 w-4 text-[#f59e0b]" />;
}

function getActivityBg(entry: DashboardSummary['recentActivity'][number]): string {
  if (entry.iconKind === 'client') {
    return 'bg-[rgba(16,185,129,0.14)]';
  }
  if (entry.iconKind === 'revision') {
    return 'bg-[rgba(245,158,11,0.14)]';
  }
  if (entry.iconKind === 'approval') {
    return 'bg-[rgba(16,185,129,0.14)]';
  }
  if (entry.iconKind === 'upload') {
    return 'bg-[rgba(59,130,246,0.14)]';
  }

  return 'bg-[rgba(245,158,11,0.14)]';
}

function getStatIcon(title: string): React.ReactNode {
  switch (title) {
    case 'Total Assets':
      return <LayoutGrid className="h-5 w-5 text-[#6366f1]" />;
    case 'Total Clients':
      return <Users className="h-5 w-5 text-[#10b981]" />;
    case 'Total Reels':
      return <Sparkles className="h-5 w-5 text-[#3b82f6]" />;
    case 'Total Posters':
      return <FileWarning className="h-5 w-5 text-[#f59e0b]" />;
    case 'Published Content':
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
    case 'Total Reels':
      return 'bg-[rgba(59,130,246,0.12)]';
    case 'Total Posters':
      return 'bg-[rgba(245,158,11,0.12)]';
    case 'Published Content':
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
  const [clients, setClients] = useState<Client[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentActivityLocal, setRecentActivityLocal] = useState<DashboardSummary['recentActivity'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('monthly');
  const eventSourceRef = useRef<EventSource | null>(null);

  const refreshDashboard = async () => {
    try {
      const summaryData = await dashboardApi.getSummary();
      setClients(summaryData.clients ?? []);
      setSummary(summaryData);
      setRecentActivityLocal(summaryData.recentActivity ?? []);
    } catch (err) {
      console.error('Failed to refresh dashboard summary', err);
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      try {
        setError(null);
        const summaryData = await dashboardApi.getSummary();
        // api response received
        if (!isActive) {
          return;
        }
        setClients(summaryData.clients ?? []);
        setSummary(summaryData);
        setRecentActivityLocal(summaryData.recentActivity ?? []);
      } catch (err) {
        if (!isActive) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Failed to load dashboard';
        logProductionRuntimeError('dashboard-loader', err, {
          pathname: '/dashboard',
        });
        setClients([]);
        setSummary(null);
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

  const pendingApprovals = summary?.pendingApprovals ?? 0;
  const totalClients = summary?.totalClients || clients.length || 0;
  const approvedAssets = summary?.approvedAssets ?? 0;
  const totalAssets = summary?.totalAssets ?? 0;

  // summary state updated

  const recentActivity = useMemo<ActivityRow[]>(() => {
    const source = recentActivityLocal ?? (summary?.recentActivity ?? []);
    return source.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      href: entry.href,
      title: entry.title,
      detail: entry.detail,
      timestamp: entry.timestamp,
      iconKind: entry.iconKind,
      icon: getActivityIcon(entry),
      iconBgClassName: getActivityBg(entry),
    }));
  }, [summary, recentActivityLocal]);

  const groupedActivities = useMemo(() => {
    const map = new Map<string, ActivityRow[]>();
    for (const item of recentActivity) {
      const label = formatDateLabel(item.timestamp);
      const arr = map.get(label) ?? [];
      arr.push(item);
      map.set(label, arr);
    }
    const groups = Array.from(map.entries())
      .map(([label, items]) => ({ label, items }))
      .sort((a, b) => {
        const aTime = a.items[0]?.timestamp?.getTime() ?? 0;
        const bTime = b.items[0]?.timestamp?.getTime() ?? 0;
        return bTime - aTime;
      });
    return groups;
  }, [recentActivity]);

  const assetStatusBreakdown = summary?.assetStatusBreakdown ?? [
    { label: 'Draft' as const, count: 0 },
    { label: 'Revision' as const, count: 0 },
    { label: 'Approved' as const, count: 0 },
    { label: 'Published' as const, count: 0 },
  ];



  const clientChips = useMemo(() => {
    return clients.slice(0, 10);
  }, [clients]);

  const deliverablesStats = useMemo(() => {
    let plannedReels = 0;
    let completedReels = 0;
    let plannedPosters = 0;
    let completedPosters = 0;

    if (timeframe === 'weekly') {
      for (const client of clients) {
        plannedReels += client.weeklyReelGoal ?? 0;
        completedReels += client.weeklyCompletedReels ?? 0;
        plannedPosters += client.weeklyPosterGoal ?? 0;
        completedPosters += client.weeklyCompletedPosters ?? 0;
      }
    } else {
      for (const client of clients) {
        plannedReels += client.monthlyReelsTarget ?? 0;
        completedReels += client.completedReels ?? 0;
        plannedPosters += client.monthlyPostsTarget ?? 0;
        completedPosters += client.completedPosters ?? 0;
      }
    }

    const remainingReels = Math.max(0, plannedReels - completedReels);
    const reelsPct = plannedReels > 0 ? Math.round((completedReels / plannedReels) * 100) : 0;

    const remainingPosters = Math.max(0, plannedPosters - completedPosters);
    const postersPct = plannedPosters > 0 ? Math.round((completedPosters / plannedPosters) * 100) : 0;

    return {
      reels: {
        planned: plannedReels,
        completed: completedReels,
        remaining: remainingReels,
        pct: reelsPct,
      },
      posters: {
        planned: plannedPosters,
        completed: completedPosters,
        remaining: remainingPosters,
        pct: postersPct,
      },
    };
  }, [clients, timeframe]);

  const publishedContentCount = summary?.publishedContentCount ?? 0;

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
        title: 'Total Reels',
        value: `${deliverablesStats.reels.completed} / ${deliverablesStats.reels.planned}`,
        trendLabel: `${deliverablesStats.reels.pct}% completed`,
        trendDirection: deliverablesStats.reels.pct > 0 ? 'up' : 'neutral',
        icon: getStatIcon('Total Reels'),
        iconBgClassName: getStatBg('Total Reels'),
      },
      {
        title: 'Total Posters',
        value: `${deliverablesStats.posters.completed} / ${deliverablesStats.posters.planned}`,
        trendLabel: `${deliverablesStats.posters.pct}% completed`,
        trendDirection: deliverablesStats.posters.pct > 0 ? 'up' : 'neutral',
        icon: getStatIcon('Total Posters'),
        iconBgClassName: getStatBg('Total Posters'),
      },
      {
        title: 'Published Content',
        value: publishedContentCount.toString(),
        trendLabel: 'All-time published',
        trendDirection: 'neutral',
        icon: getStatIcon('Published Content'),
        iconBgClassName: getStatBg('Published Content'),
      },
    ],
    [totalAssets, totalClients, deliverablesStats, publishedContentCount]
  );

  const clientPerformance = useMemo(() => {
    const list = clients.map((client) => {
      let goal = 0;
      let completed = 0;
      let remaining = 0;
      let pct = 0;

      if (timeframe === 'weekly') {
        goal = client.weeklyGoal ?? 0;
        completed = client.weeklyCompleted ?? 0;
        remaining = client.weeklyRemaining ?? 0;
        pct = goal > 0 ? Math.round((completed / goal) * 100) : 0;
      } else {
        goal = client.monthlyDeliverables ?? 0;
        completed = client.completedDeliverables ?? 0;
        remaining = Math.max(0, goal - completed);
        pct = goal > 0 ? Math.round((completed / goal) * 100) : 0;
      }

      const perf = summary?.clientPerformance?.find((p) => p.id === client.id);
      const nextPublishDate = perf ? perf.nextPublishDate : null;

      return {
        id: client.id,
        name: client.name,
        goal,
        completed,
        remaining,
        pct,
        nextPublishDate,
      };
    });

    return list.sort((a, b) => {
      if (!a.nextPublishDate && !b.nextPublishDate) return 0;
      if (!a.nextPublishDate) return 1;
      if (!b.nextPublishDate) return -1;
      return new Date(a.nextPublishDate).getTime() - new Date(b.nextPublishDate).getTime();
    });
  }, [clients, timeframe, summary]);

  const deliverablesOverviewSection = useMemo(() => {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="content-panel p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Reels Overview</h4>
              <p className="text-xl font-bold text-white mt-1">
                {deliverablesStats.reels.completed} / {deliverablesStats.reels.planned}
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.1)] text-[#34d399]">
              {deliverablesStats.reels.pct}% Done
            </span>
          </div>
          <div className="space-y-2">
            <div className="h-2 w-full bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div style={{ width: `${deliverablesStats.reels.pct}%` }} className="h-full bg-[linear-gradient(90deg,#10b981,#34d399)] transition-all duration-300" />
            </div>
            <div className="flex justify-between text-[11px] text-[#71717a]">
              <span>Planned: {deliverablesStats.reels.planned}</span>
              <span>Remaining: {deliverablesStats.reels.remaining}</span>
            </div>
          </div>
        </Card>

        <Card className="content-panel p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Posters Overview</h4>
              <p className="text-xl font-bold text-white mt-1">
                {deliverablesStats.posters.completed} / {deliverablesStats.posters.planned}
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.1)] text-[#34d399]">
              {deliverablesStats.posters.pct}% Done
            </span>
          </div>
          <div className="space-y-2">
            <div className="h-2 w-full bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div style={{ width: `${deliverablesStats.posters.pct}%` }} className="h-full bg-[linear-gradient(90deg,#10b981,#34d399)] transition-all duration-300" />
            </div>
            <div className="flex justify-between text-[11px] text-[#71717a]">
              <span>Planned: {deliverablesStats.posters.planned}</span>
              <span>Remaining: {deliverablesStats.posters.remaining}</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }, [deliverablesStats]);

  const clientPerformanceTableSection = useMemo(() => {
    return (
      <Card className="content-panel">
        <div className="panel-header">
          <h3 className="panel-title">Top Active Clients</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.05)] text-[10px] font-semibold uppercase tracking-wider text-[#a1a1aa]">
                <th className="py-2.5 px-4">Client Name</th>
                <th className="py-2.5 px-4 text-center">Goal</th>
                <th className="py-2.5 px-4 text-center">Completed</th>
                <th className="py-2.5 px-4 text-center">Remaining</th>
                <th className="py-2.5 px-4 text-center">Completion %</th>
                <th className="py-2.5 px-4 text-right">Next Publish Date</th>
              </tr>
            </thead>
            <tbody>
              {clientPerformance.length > 0 ? (
                clientPerformance.map((item) => (
                  <tr key={item.id} className="border-b border-[rgba(255,255,255,0.02)] last:border-b-0 hover:bg-[rgba(255,255,255,0.01)] text-xs text-[#e4e4e7] transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-white">
                      <Link href={`/dashboard/clients/${item.id}`} className="hover:underline">
                        {item.name}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-center font-medium">{item.goal}</td>
                    <td className="py-2.5 px-4 text-center text-[#34d399] font-medium">{item.completed}</td>
                    <td className="py-2.5 px-4 text-center font-medium">{item.remaining}</td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-semibold">{item.pct}%</span>
                        <div className="h-1.5 w-12 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden hidden sm:block">
                          <div style={{ width: `${item.pct}%` }} className="h-full bg-[#10b981]" />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right text-[#a1a1aa]">
                      {item.nextPublishDate ? new Date(item.nextPublishDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      }) : <span className="text-[#52525b]">None scheduled</span>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#71717a]">
                    No active clients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }, [clientPerformance]);

  const productionPipelineSection = useMemo(() => {
    return (
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
    );
  }, [assetStatusBreakdown]);

  const goalsSection = useMemo(() => {
    return (
      <Card className="content-panel">
        <div className="panel-header">
          <h3 className="panel-title">{timeframe === 'weekly' ? 'Weekly Goals' : 'Monthly Goals'}</h3>
        </div>
        <div className="p-4 space-y-3">
          {clients.length > 0 ? (
            clients
              .slice(0, 8)
              .map((client) => {
                const goal = timeframe === 'weekly' ? (client.weeklyGoal ?? 0) : (client.monthlyDeliverables ?? 0);
                const done = timeframe === 'weekly' ? (client.weeklyCompleted ?? 0) : (client.completedDeliverables ?? 0);
                const pct = goal > 0 ? Math.round((Math.min(done, goal) / goal) * 100) : 0;
                return (
                  <div key={client.id} className="mb-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] font-medium text-white truncate max-w-[14rem]">{client.name}</div>
                      <div className="text-[12px] text-[#71717a]">{done}/{goal}</div>
                    </div>
                    <div className="mt-2 h-2 w-full bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="h-full bg-[linear-gradient(90deg,#10b981,#34d399)]" />
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="p-3 text-[12px] text-[#a1a1aa]">No clients to display</div>
          )}
        </div>
      </Card>
    );
  }, [clients, timeframe]);

  function formatDateLabel(date: Date): string {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  useEffect(() => {
    // SSE with reconnection/backoff/jitter and authoritative reconciliation
    if (typeof window === 'undefined') return;
    if (eventSourceRef.current) return;

    const RECONCILE_AFTER_EVENTS = 5;
    const RECONCILE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

    const sseEventCountRef = { current: 0 } as { current: number };
    let lastReconcileAt = Date.now();

    let backoffAttempt = 0;
    let reconnectTimer: number | null = null;

    function hasActivityId(id?: string) {
      if (!id) return false;
      const src = recentActivityLocal ?? (summary?.recentActivity ?? []);
      return src.some((a) => a.id === id);
    }

    async function reconcileIfNeeded(force = false) {
      const now = Date.now();
      const since = now - lastReconcileAt;
      if (!force && sseEventCountRef.current < RECONCILE_AFTER_EVENTS && since < RECONCILE_INTERVAL_MS) {
        return;
      }
      try {
        const full = await dashboardApi.getSummary();
        setSummary(full);
        setRecentActivityLocal(full.recentActivity ?? []);
        sseEventCountRef.current = 0;
        lastReconcileAt = Date.now();
        backoffAttempt = 0;
      } catch (err) {
        // log and keep trying later
        console.warn('[dashboard][reconcile][failed]', err instanceof Error ? err.message : String(err));
      }
    }

    function connect() {
      if (eventSourceRef.current) return;
      const es = new EventSource('/api/events/stream');
      eventSourceRef.current = es;

      const handleAssetEvent = async (ev: MessageEvent) => {
        try {
          const payload = JSON.parse(ev.data);
          const activityId = payload.id as string | undefined;
          const assetId = payload.assetId ?? payload.asset_id;
          const action = payload.action ?? payload.type;
          if (!assetId) return;

          // dedupe using stable activity id
          if (activityId && hasActivityId(activityId)) {
            return;
          }

          // fetch lightweight asset summary (best-effort)
          let assetSummary = null;
          try {
            assetSummary = await assetsApi.getSummaryById(assetId);
          } catch (_err) {
            assetSummary = null;
          }

          const entry = {
            id: activityId ?? `asset-${assetId}-${Date.now()}`,
            kind: 'asset' as const,
            href: `/dashboard/assets/${assetId}`,
            title: assetSummary?.title ?? `Asset ${assetId}`,
            detail: `${(action ?? '').toString().replace(/_/g, ' ')} • ${assetSummary?.type ?? ''} asset`,
            timestamp: new Date(payload.createdAt ?? payload.created_at ?? new Date().toISOString()),
            iconKind:
              action === 'revision_created' || action === 'revision_activated'
                ? 'revision'
                : action === 'asset_created' || action === 'file_uploaded'
                  ? 'upload'
                  : action === 'status_changed' && payload.metadata && (payload.metadata.to === 'approved' || payload.metadata.to === 'published')
                    ? 'approval'
                    : 'status',
          };

          setRecentActivityLocal((prev) => {
            const existing = (prev ?? []).filter((r) => r.id !== entry.id);
            const next = [entry as DashboardSummary['recentActivity'][number], ...existing];
            return next.slice(0, 8);
          });

          // minimal delta updates
          setSummary((prev) => {
            if (!prev) return prev;
            const next = { ...prev } as DashboardSummary;
            if (action === 'asset_created') {
              next.totalAssets = (next.totalAssets ?? 0) + 1;
              const status = payload.metadata?.status ?? assetSummary?.status;
              if (status && ['draft', 'in_design', 'ready_for_review', 'revision_requested'].includes(status)) {
                next.pendingApprovals = Math.max(0, (next.pendingApprovals ?? 0) + 1);
              }
            }

            if (action === 'status_changed') {
              const to = typeof payload.metadata?.to === 'string' ? payload.metadata.to : null;
              if (to === 'approved') {
                next.approvedAssets = Math.max(0, (next.approvedAssets ?? 0) + 1);
                next.pendingApprovals = Math.max(0, (next.pendingApprovals ?? 0) - 1);
              }
              if (to === 'published') {
                try {
                  const publishedAt = assetSummary?.publishedAt ? new Date(assetSummary.publishedAt) : null;
                  if (publishedAt) {
                    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                    if (publishedAt >= monthStart) {
                      next.uploadedThisMonth = (next.uploadedThisMonth ?? 0) + 1;
                    }
                  }
                } catch (_e) {
                  // ignore
                }
              }
            }

            return next;
          });

          // reconciliation triggers
          sseEventCountRef.current++;
          const isCritical = action === 'asset_created' || (action === 'status_changed' && payload.metadata && (payload.metadata.to === 'approved' || payload.metadata.to === 'published'));
          if (isCritical) {
            // immediate authoritative reconciliation
            void reconcileIfNeeded(true);
          } else {
            // schedule reconcile if threshold reached
            if (sseEventCountRef.current >= RECONCILE_AFTER_EVENTS) {
              void reconcileIfNeeded(false);
            }
          }
        } catch (_err) {
          // parse error - ignore
        }
      };

      es.addEventListener('asset.activity', (ev) => { void handleAssetEvent(ev as MessageEvent); });
      es.onmessage = (ev) => { void handleAssetEvent(ev); };

      es.onopen = () => {
        backoffAttempt = 0;
      };

      es.onerror = () => {
        try {
          es.close();
        } catch (_e) { }
        eventSourceRef.current = null;
        // schedule reconnect with exponential backoff + jitter
        backoffAttempt = Math.min(10, backoffAttempt + 1);
        const base = 500; // ms
        const backoff = Math.min(60000, base * Math.pow(2, backoffAttempt));
        const jitter = 0.5 + Math.random();
        const delay = Math.round(backoff * jitter);
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, delay) as unknown as number;
      };
    }

    connect();

    // periodic reconciliation
    const periodic = window.setInterval(() => {
      void reconcileIfNeeded(false);
    }, RECONCILE_INTERVAL_MS);

    return () => {
      try {
        if (eventSourceRef.current) eventSourceRef.current.close();
      } catch (_e) { }
      eventSourceRef.current = null;
      try {
        clearInterval(periodic);
      } catch (_e) { }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[18px] font-medium text-white">Dashboard</h1>
          <div className="mt-1 text-[12px] text-[#71717a]">Dashboard</div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>

        <Skeleton className="h-14" />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="content-panel xl:col-span-2">
            <div className="panel-header">
              <h3 className="panel-title">Recent Activity</h3>
            </div>
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 mb-2" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="content-panel">
              <div className="panel-header">
                <h3 className="panel-title">Asset Status Breakdown</h3>
              </div>
              <div className="p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="mb-3">
                    <Skeleton className="h-4" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <div>
          <Skeleton className="h-8 w-40" />
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
    <ErrorBoundary>
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

        .stat-card {
          background-color: var(--color-bg-surface) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-lg) !important;
          padding: 20px 22px !important;
          transition: border-color 150ms ease !important;
          position: relative;
          overflow: hidden;
          box-shadow: none !important;
          height: 100% !important;
          display: flex;
          flex-direction: column;
          justify-content: center;
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

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              {/* Timeframe Selector */}
              <div className="flex items-center gap-1 rounded-lg bg-[rgba(255,255,255,0.04)] p-0.5 border border-[rgba(255,255,255,0.05)] mr-2">
                <button
                  onClick={() => setTimeframe('weekly')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${timeframe === 'weekly'
                      ? 'bg-[var(--color-bg-surface)] text-white shadow-sm border border-[rgba(255,255,255,0.05)]'
                      : 'text-[#71717a] hover:text-[#a1a1aa]'
                    }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setTimeframe('monthly')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${timeframe === 'monthly'
                      ? 'bg-[var(--color-bg-surface)] text-white shadow-sm border border-[rgba(255,255,255,0.05)]'
                      : 'text-[#71717a] hover:text-[#a1a1aa]'
                    }`}
                >
                  Monthly
                </button>
              </div>

              <AssetFormDialog
                mode="create"
                onSaved={() => {
                  void refreshDashboard();
                }}
                trigger={
                  <Button variant="accent" className="new-asset-btn">
                    <Plus className="mr-2 h-4 w-4" />
                    New Asset
                  </Button>
                }
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
              onSaved={() => {
                void refreshDashboard();
              }}
              trigger={
                <Button variant="accent" className="quick-action-btn flex items-center">
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
          <div className="xl:col-span-2 space-y-6">
            {/* Deliverables Overview Section */}
            {deliverablesOverviewSection}

            {/* Top Active Clients Section */}
            {clientPerformanceTableSection}

            {/* Recent Activity */}
            <Card className="content-panel">
              <div className="panel-header">
                <h3 className="panel-title">Recent Activity</h3>
                <Link href="/dashboard/assets" className="panel-link">
                  View all
                </Link>
              </div>

              <div className="space-y-1 p-2">
                {groupedActivities.length > 0 ? (
                  groupedActivities.map((group) => (
                    <div key={group.label} className="mb-2">
                      <div className="text-[12px] text-[#a1a1aa] mb-1 font-semibold">{group.label}</div>
                      {group.items.map((item, idx) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          className="relative flex h-10 items-center justify-between rounded-md px-3 text-sm transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.iconBgClassName}`}>
                              {item.icon}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium text-white">{item.title}</p>
                              <p className="truncate text-[12px] text-[#a1a1aa]">{item.detail}</p>
                            </div>
                          </div>

                          <span className="shrink-0 text-[12px] text-[#71717a]">{formatTime(item.timestamp)}</span>

                          {idx < group.items.length - 1 && (
                            <div className="absolute inset-x-3 bottom-0 h-px bg-[rgba(255,255,255,0.05)]" aria-hidden="true" />
                          )}
                        </Link>
                      ))}
                    </div>
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
          </div>

          <div className="space-y-6">
            {/* Production Pipeline Section */}
            {productionPipelineSection}

            {/* Goals Section */}
            {goalsSection}
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
    </ErrorBoundary>
  );
}
