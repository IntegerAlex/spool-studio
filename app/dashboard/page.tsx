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
import { cn } from '@/lib/utils';
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
  const isRefreshingRef = useRef(false);
  const lastRefreshTimeRef = useRef(0);

  const refreshDashboard = async () => {
    const now = Date.now();
    if (isRefreshingRef.current || now - lastRefreshTimeRef.current < 2000) {
      return;
    }
    try {
      isRefreshingRef.current = true;
      const summaryData = await dashboardApi.getSummary();
      setClients(summaryData.clients ?? []);
      setSummary(summaryData);
      setRecentActivityLocal(summaryData.recentActivity ?? []);
      lastRefreshTimeRef.current = Date.now();
    } catch (err) {
      console.error('Failed to refresh dashboard summary', err);
    } finally {
      isRefreshingRef.current = false;
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

  const activitySummary = useMemo(() => {
    const source = recentActivityLocal ?? (summary?.recentActivity ?? []);
    const todayStr = new Date().toDateString();
    let totalToday = 0;
    let uploads = 0;
    let revisions = 0;
    let approvals = 0;

    for (const activity of source) {
      const d = new Date(activity.timestamp);
      if (d.toDateString() === todayStr) {
        totalToday++;
        if (activity.iconKind === 'upload') {
          uploads++;
        } else if (activity.iconKind === 'revision') {
          revisions++;
        } else if (activity.iconKind === 'approval') {
          approvals++;
        }
      }
    }

    return { totalToday, uploads, revisions, approvals };
  }, [summary, recentActivityLocal]);

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

  const reelsOverviewCard = useMemo(() => {
    return (
      <Card className="content-panel p-5">
        <h4 className="text-[11.5px] font-semibold text-[#a1a1aa] uppercase tracking-wider text-center mb-4">Reels Overview</h4>
        
        <div className="px-2 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-white leading-none">
              {deliverablesStats.reels.completed} / {deliverablesStats.reels.planned}
            </span>
            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.14)] text-[#34d399]">
              {deliverablesStats.reels.pct}% Done
            </span>
          </div>
          <div className="h-1.5 w-full bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
            <div style={{ width: `${deliverablesStats.reels.pct}%` }} className="h-full bg-[linear-gradient(90deg,#10b981,#34d399)] transition-all duration-300" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-[rgba(255,255,255,0.02)] mt-4 px-2">
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-white leading-none">{deliverablesStats.reels.planned}</span>
            <span className="text-[9.5px] font-semibold text-[#71717a] uppercase tracking-wider mt-1">Planned</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-white leading-none">{deliverablesStats.reels.completed}</span>
            <span className="text-[9.5px] font-semibold text-[#71717a] uppercase tracking-wider mt-1">Published</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-white leading-none">{deliverablesStats.reels.remaining}</span>
            <span className="text-[9.5px] font-semibold text-[#71717a] uppercase tracking-wider mt-1">Remaining</span>
          </div>
        </div>
      </Card>
    );
  }, [deliverablesStats]);

  const postersOverviewCard = useMemo(() => {
    return (
      <Card className="content-panel p-5">
        <h4 className="text-[11.5px] font-semibold text-[#a1a1aa] uppercase tracking-wider text-center mb-4">Posters Overview</h4>
        
        <div className="px-2 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-white leading-none">
              {deliverablesStats.posters.completed} / {deliverablesStats.posters.planned}
            </span>
            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.14)] text-[#34d399]">
              {deliverablesStats.posters.pct}% Done
            </span>
          </div>
          <div className="h-1.5 w-full bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
            <div style={{ width: `${deliverablesStats.posters.pct}%` }} className="h-full bg-[linear-gradient(90deg,#10b981,#34d399)] transition-all duration-300" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-[rgba(255,255,255,0.02)] mt-4 px-2">
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-white leading-none">{deliverablesStats.posters.planned}</span>
            <span className="text-[9.5px] font-semibold text-[#71717a] uppercase tracking-wider mt-1">Planned</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-white leading-none">{deliverablesStats.posters.completed}</span>
            <span className="text-[9.5px] font-semibold text-[#71717a] uppercase tracking-wider mt-1">Published</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-white leading-none">{deliverablesStats.posters.remaining}</span>
            <span className="text-[9.5px] font-semibold text-[#71717a] uppercase tracking-wider mt-1">Remaining</span>
          </div>
        </div>
      </Card>
    );
  }, [deliverablesStats]);

  const clientPerformanceTableSection = useMemo(() => {
    return (
      <Card className="content-panel">
        <div className="panel-header">
          <h3 className="panel-title">Top Active Clients</h3>
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[320px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky-header">
              <tr className="border-b border-[rgba(255,255,255,0.05)] text-[10px] font-semibold uppercase tracking-wider text-[#a1a1aa]">
                <th className="py-2 px-3">Client Name</th>
                <th className="py-2 px-3 text-center">Goal</th>
                <th className="py-2 px-3 text-center">Completed</th>
                <th className="py-2 px-3 text-center">Remaining</th>
                <th className="py-2 px-3 text-center">Completion %</th>
                <th className="py-2 px-3 text-right">Next Publish Date</th>
              </tr>
            </thead>
            <tbody>
              {clientPerformance.length > 0 ? (
                clientPerformance.map((item) => {
                  const pctBadgeClass = item.pct >= 75 
                    ? 'bg-[rgba(16,185,129,0.12)] text-[#34d399]' 
                    : item.pct >= 40 
                      ? 'bg-[rgba(245,158,11,0.12)] text-[#fbbf24]' 
                      : 'bg-[rgba(239,68,68,0.12)] text-[#f87171]';
                  return (
                    <tr key={item.id} className="border-b border-[rgba(255,255,255,0.02)] last:border-b-0 hover:bg-[rgba(255,255,255,0.01)] text-xs text-[#e4e4e7] transition-colors">
                      <td className="py-2 px-3 font-semibold text-[13.5px] text-white">
                        <Link href={`/dashboard/clients/${item.id}`} className="hover:underline">
                          {item.name}
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-center font-medium">{item.goal}</td>
                      <td className="py-2 px-3 text-center text-[#34d399] font-medium">{item.completed}</td>
                      <td className="py-2 px-3 text-center font-medium">{item.remaining}</td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-semibold', pctBadgeClass)}>
                            {item.pct}%
                          </span>
                          <div className="h-1 w-12 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden hidden sm:block">
                            <div style={{ width: `${item.pct}%` }} className={cn('h-full', item.pct >= 75 ? 'bg-[#10b981]' : item.pct >= 40 ? 'bg-[#fbbf24]' : 'bg-[#ef4444]')} />
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right text-[#a1a1aa]">
                        {item.nextPublishDate ? new Date(item.nextPublishDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        }) : <span className="text-[#52525b]">None scheduled</span>}
                      </td>
                    </tr>
                  );
                })
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
        <div className="p-3 space-y-2">
          {clients.length > 0 ? (
            clients
              .slice(0, 8)
              .map((client) => {
                const goal = timeframe === 'weekly' ? (client.weeklyGoal ?? 0) : (client.monthlyDeliverables ?? 0);
                const done = timeframe === 'weekly' ? (client.weeklyCompleted ?? 0) : (client.completedDeliverables ?? 0);
                const pct = goal > 0 ? Math.round((Math.min(done, goal) / goal) * 100) : 0;
                return (
                  <div key={client.id} className="flex items-center justify-between gap-3 py-1">
                    <div className="text-[12.5px] font-medium text-white truncate w-24 shrink-0">{client.name}</div>
                    <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden mx-1">
                      <div style={{ width: `${pct}%` }} className="h-full bg-[linear-gradient(90deg,#10b981,#34d399)]" />
                    </div>
                    <div className="text-[11.5px] font-medium text-[#71717a] w-12 text-right shrink-0">{done}/{goal}</div>
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
    if (typeof window === 'undefined') return;

    // Refresh dashboard summary and recent activity every 60 seconds
    const POLL_INTERVAL_MS = 60 * 1000;

    const intervalId = window.setInterval(() => {
      void refreshDashboard();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
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
      <div className="space-y-6 dashboard-container" style={{ backgroundColor: 'var(--color-bg-app)', minHeight: '100vh', margin: '0', padding: '16px 24px 24px 24px' }}>
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
          padding: 8px 12px !important;
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
          font-size: 10.5px !important;
          font-weight: 500 !important;
          letter-spacing: 0.05em !important;
          color: var(--color-text-muted) !important;
          text-transform: uppercase !important;
        }
        .stat-card-number {
          font-size: 28px !important;
          font-weight: 700 !important;
          color: var(--color-text-primary) !important;
          letter-spacing: -0.03em !important;
          line-height: 1.0 !important;
          margin-top: 4px !important;
        }
        .stat-trend-text {
          font-size: 11px !important;
          color: var(--color-text-muted) !important;
          margin-top: 4px !important;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .stat-card-icon-container {
          width: 22px !important;
          height: 22px !important;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent !important;
          flex-shrink: 0;
        }
        .stat-card-icon {
          width: 11px !important;
          height: 11px !important;
          color: var(--color-text-faint) !important;
        }
        .quick-action-row {
          background-color: var(--color-bg-surface) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-lg) !important;
          padding: 6px 12px !important;
          box-shadow: none !important;
        }
        .quick-action-btn {
          background-color: transparent !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-sm) !important;
          padding: 8px 16px !important;
          font-size: 12.5px !important;
          color: var(--color-text-muted) !important;
          gap: 8px !important;
          transition: all 120ms ease !important;
          height: 38px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .quick-action-btn:hover {
          background-color: var(--color-bg-hover) !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.08) !important;
          color: var(--color-text-primary) !important;
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
          padding: 12px 16px !important;
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
          padding: 32px 16px !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px !important;
        }
        .breakdown-row {
          padding: 8px 16px !important;
          border-bottom: none !important;
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
          font-size: 12.5px !important;
          color: var(--color-text-secondary) !important;
        }
        .breakdown-number {
          font-size: 12.5px !important;
          font-weight: 500 !important;
          color: var(--color-text-primary) !important;
        }
        .section-heading-container {
          padding-top: 20px !important;
          margin-bottom: 10px !important;
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
        .sticky-header th {
          position: sticky !important;
          top: 0 !important;
          background-color: var(--color-bg-surface) !important;
          z-index: 10 !important;
          box-shadow: inset 0 -1px 0 var(--color-border);
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
              <div className="flex items-center justify-between gap-4 h-full">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full">
            <AssetFormDialog
              mode="create"
              onSaved={() => {
                void refreshDashboard();
              }}
              trigger={
                <Button variant="accent" className="quick-action-btn w-full">
                  <Plus className="quick-action-icon mr-2" />
                  <span>New Asset</span>
                </Button>
              }
            />

            <Button asChild variant="ghost" className="quick-action-btn w-full">
              <Link href="/dashboard/assets">
                <Upload className="quick-action-icon mr-2" />
                <span>Upload Files</span>
              </Link>
            </Button>

            <Button asChild variant="ghost" className="quick-action-btn w-full">
              <Link href="/dashboard/clients">
                <FolderPlus className="quick-action-icon mr-2" />
                <span>Add Client</span>
              </Link>
            </Button>

            <Button asChild variant="ghost" className="quick-action-btn w-full">
              <Link href="/dashboard/kanban">
                <KanbanSquare className="quick-action-icon mr-2" />
                <span>View Kanban</span>
              </Link>
            </Button>
          </div>
        </Card>

        {/* Row 3: Reels Overview, Posters Overview, Asset Status Breakdown */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 items-start">
          {reelsOverviewCard}
          {postersOverviewCard}
          {productionPipelineSection}
        </div>

        {/* Row 4: Top Active Clients & Monthly Goals */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {clientPerformanceTableSection}
          </div>
          <div>
            {goalsSection}
          </div>
        </div>

        {/* Row 5: Recent Activity Summary & Client Workspaces */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="content-panel">
              <div className="panel-header">
                <h3 className="panel-title">Recent Activity Summary</h3>
                <Link href="/dashboard/logs" className="panel-link">
                  View Logs
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
                <div className="rounded-lg bg-[rgba(255,255,255,0.02)] p-4 border border-[rgba(255,255,255,0.04)] text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#3b82f6] mb-1">Today's Uploads</p>
                  <p className="text-2xl font-bold text-white">{activitySummary.uploads}</p>
                </div>
                <div className="rounded-lg bg-[rgba(255,255,255,0.02)] p-4 border border-[rgba(255,255,255,0.04)] text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#f59e0b] mb-1">Today's Revisions</p>
                  <p className="text-2xl font-bold text-white">{activitySummary.revisions}</p>
                </div>
                <div className="rounded-lg bg-[rgba(255,255,255,0.02)] p-4 border border-[rgba(255,255,255,0.04)] text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#10b981] mb-1">Approvals Today</p>
                  <p className="text-2xl font-bold text-white">{activitySummary.approvals}</p>
                </div>
                <div className="rounded-lg bg-[rgba(255,255,255,0.02)] p-4 border border-[rgba(255,255,255,0.04)] text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#ef4444] mb-1">Pending Reviews</p>
                  <p className="text-2xl font-bold text-white text-[#ef4444]">{pendingApprovals}</p>
                </div>
              </div>
            </Card>
          </div>
          <div>
            <div className="section-heading-container" style={{ paddingTop: '0', marginTop: '0' }}>
              <h3 className="section-heading">Clients</h3>
              <p className="section-sublabel">Quick access to active client workspaces</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 pb-1">
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
        </div>
      </div>
    </ErrorBoundary>
  );
}
