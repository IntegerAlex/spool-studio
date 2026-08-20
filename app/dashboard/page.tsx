"use client"

import {
  CheckCircle2,
  Clock3,
  FileWarning,
  FolderPlus,
  KanbanSquare,
  LayoutGrid,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Upload,
  Users,
} from "lucide-react"
import Link from "next/link"
import type React from "react"
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AssetFormDialog } from "@/components/assets/asset-form-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import ErrorBoundary from "@/components/ui/error-boundary"
import { Skeleton } from "@/components/ui/skeleton"
import { dashboardApi } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { Client } from "@/types/index"

type TrendDirection = "up" | "down" | "neutral"
type DashboardSummary = Awaited<ReturnType<typeof dashboardApi.getSummary>>
type DashboardStatCard = { title: string; value: string; trendLabel: string; trendDirection: TrendDirection; icon: React.ReactNode; iconBgClassName: string }
type ActivityRow = { id: string; kind: DashboardSummary["recentActivity"][number]["kind"]; href: string; title: string; detail: string; timestamp: Date; iconKind: DashboardSummary["recentActivity"][number]["iconKind"]; icon: React.ReactNode; iconBgClassName: string }

function getActivityIcon(entry: DashboardSummary["recentActivity"][number]): React.ReactNode {
  if (entry.iconKind === "client") return <Users className="h-4 w-4 text-emerald-400" />
  if (entry.iconKind === "revision") return <FileWarning className="h-4 w-4 text-amber-400" />
  if (entry.iconKind === "approval") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
  if (entry.iconKind === "upload") return <Upload className="h-4 w-4 text-emerald-400" />
  return <Clock3 className="h-4 w-4 text-amber-400" />
}
function getActivityBg(entry: DashboardSummary["recentActivity"][number]): string {
  if (entry.iconKind === "client") return "bg-emerald-500/15"
  if (entry.iconKind === "revision") return "bg-amber-500/15"
  if (entry.iconKind === "approval") return "bg-emerald-500/15"
  if (entry.iconKind === "upload") return "bg-emerald-500/15"
  return "bg-amber-500/15"
}
function getStatIcon(title: string): React.ReactNode {
  switch (title) {
    case "Total Assets": return <LayoutGrid className="h-5 w-5 text-emerald-400" />
    case "Total Clients": return <Users className="h-5 w-5 text-emerald-400" />
    case "Total Reels": return <Sparkles className="h-5 w-5 text-emerald-400" />
    case "Total Posters": return <FileWarning className="h-5 w-5 text-emerald-400" />
    case "Published Content": return <CheckCircle2 className="h-5 w-5 text-emerald-400" />
    default: return <Sparkles className="h-5 w-5 text-emerald-400" />
  }
}
function getStatBg(_title: string): string { return "bg-emerald-500/12" }

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly">("monthly")

  const { data: summary, isLoading, error, isFetching } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.getSummary(),
  })

  const clients = summary?.clients ?? []
  const refreshDashboard = () => queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] })

  const pendingApprovals = summary?.pendingApprovals ?? 0
  const totalClients = summary?.totalClients || clients.length || 0
  const totalAssets = summary?.totalAssets ?? 0

  const recentActivity = useMemo<ActivityRow[]>(() => {
    const source = summary?.recentActivity ?? []
    return source.map((entry) => ({ id: entry.id, kind: entry.kind, href: entry.href, title: entry.title, detail: entry.detail, timestamp: entry.timestamp, iconKind: entry.iconKind, icon: getActivityIcon(entry), iconBgClassName: getActivityBg(entry) }))
  }, [summary])

  const activitySummary = useMemo(() => {
    const source = summary?.recentActivity ?? []
    const todayStr = new Date().toDateString()
    let uploads = 0, revisions = 0, approvals = 0
    for (const a of source) { if (new Date(a.timestamp).toDateString() === todayStr) { if (a.iconKind === "upload") uploads++; else if (a.iconKind === "revision") revisions++; else if (a.iconKind === "approval") approvals++ } }
    return { uploads, revisions, approvals }
  }, [summary])

  const assetStatusBreakdown = summary?.assetStatusBreakdown ?? [{ label: "Draft" as const, count: 0 }, { label: "Revision" as const, count: 0 }, { label: "Approved" as const, count: 0 }, { label: "Published" as const, count: 0 }]
  const clientChips = useMemo(() => clients.slice(0, 10), [clients])
  const deliverablesStats = useMemo(() => {
    let plannedReels = 0, completedReels = 0, plannedPosters = 0, completedPosters = 0
    for (const c of clients) {
      if (timeframe === "weekly") { plannedReels += c.weeklyReelGoal ?? 0; completedReels += c.weeklyCompletedReels ?? 0; plannedPosters += c.weeklyPosterGoal ?? 0; completedPosters += c.weeklyCompletedPosters ?? 0 }
      else { plannedReels += c.monthlyReelsTarget ?? 0; completedReels += c.completedReels ?? 0; plannedPosters += c.monthlyPostsTarget ?? 0; completedPosters += c.completedPosters ?? 0 }
    }
    return { reels: { planned: plannedReels, completed: completedReels, remaining: Math.max(0, plannedReels - completedReels), pct: plannedReels > 0 ? Math.round((completedReels / plannedReels) * 100) : 0 }, posters: { planned: plannedPosters, completed: completedPosters, remaining: Math.max(0, plannedPosters - completedPosters), pct: plannedPosters > 0 ? Math.round((completedPosters / plannedPosters) * 100) : 0 } }
  }, [clients, timeframe])
  const publishedContentCount = summary?.publishedContentCount ?? 0
  const statCards = useMemo<DashboardStatCard[]>(() => [
    { title: "Total Assets", value: totalAssets.toString(), trendLabel: "+12% this week", trendDirection: "up", icon: getStatIcon("Total Assets"), iconBgClassName: getStatBg("Total Assets") },
    { title: "Total Clients", value: totalClients.toString(), trendLabel: "+3 active this month", trendDirection: "up", icon: getStatIcon("Total Clients"), iconBgClassName: getStatBg("Total Clients") },
    { title: "Total Reels", value: `${deliverablesStats.reels.completed} / ${deliverablesStats.reels.planned}`, trendLabel: `${deliverablesStats.reels.pct}% completed`, trendDirection: deliverablesStats.reels.pct > 0 ? "up" : "neutral", icon: getStatIcon("Total Reels"), iconBgClassName: getStatBg("Total Reels") },
    { title: "Total Posters", value: `${deliverablesStats.posters.completed} / ${deliverablesStats.posters.planned}`, trendLabel: `${deliverablesStats.posters.pct}% completed`, trendDirection: deliverablesStats.posters.pct > 0 ? "up" : "neutral", icon: getStatIcon("Total Posters"), iconBgClassName: getStatBg("Total Posters") },
    { title: "Published Content", value: publishedContentCount.toString(), trendLabel: "All-time published", trendDirection: "neutral", icon: getStatIcon("Published Content"), iconBgClassName: getStatBg("Published Content") },
  ], [totalAssets, totalClients, deliverablesStats, publishedContentCount])
  const clientPerformance = useMemo(() => {
    const list = clients.map((client) => {
      let goal = 0, completed = 0, remaining = 0, pct = 0
      if (timeframe === "weekly") { goal = client.weeklyGoal ?? 0; completed = client.weeklyCompleted ?? 0; remaining = client.weeklyRemaining ?? 0; pct = goal > 0 ? Math.round((completed / goal) * 100) : 0 }
      else { goal = client.monthlyDeliverables ?? 0; completed = client.completedDeliverables ?? 0; remaining = Math.max(0, goal - completed); pct = goal > 0 ? Math.round((completed / goal) * 100) : 0 }
      const perf = summary?.clientPerformance?.find((p) => p.id === client.id)
      return { id: client.id, name: client.name, goal, completed, remaining, pct, nextPublishDate: perf ? perf.nextPublishDate : null }
    })
    return list.sort((a, b) => { if (!a.nextPublishDate && !b.nextPublishDate) return 0; if (!a.nextPublishDate) return 1; if (!b.nextPublishDate) return -1; return new Date(a.nextPublishDate).getTime() - new Date(b.nextPublishDate).getTime() })
  }, [clients, timeframe, summary])

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between"><div><h1 className="text-lg font-medium text-white">Dashboard</h1><p className="text-xs text-zinc-500 mt-0.5">Overview</p></div></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-24 rounded-xl" />))}</div>
        <Skeleton className="h-14 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3"><Skeleton className="h-44 rounded-xl" /><Skeleton className="h-44 rounded-xl" /><Skeleton className="h-44 rounded-xl" /></div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3"><Skeleton className="h-64 rounded-xl lg:col-span-2" /><Skeleton className="h-64 rounded-xl" /></div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="space-y-4 p-6"><div><h1 className="text-lg font-medium text-white">Dashboard</h1><p className="text-xs text-zinc-500 mt-0.5">Overview</p></div><div className="text-center py-16"><p className="text-sm text-zinc-400">{(error as Error).message}</p></div></div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-lg font-medium text-white">Dashboard</h1><p className="text-xs text-zinc-500 mt-0.5">Overview</p></div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => refreshDashboard()} disabled={isFetching} className="h-8 px-3 text-xs text-zinc-400 hover:text-white hover:bg-white/5">
              {isFetching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}Refresh
            </Button>
            <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.04] p-0.5 border border-white/[0.05]">
              <button onClick={() => setTimeframe("weekly")} className={cn("px-3 py-1 text-xs font-medium rounded-md transition-all", timeframe === "weekly" ? "bg-[var(--color-bg-surface)] text-white shadow-sm border border-white/[0.05]" : "text-zinc-500 hover:text-zinc-300")}>Weekly</button>
              <button onClick={() => setTimeframe("monthly")} className={cn("px-3 py-1 text-xs font-medium rounded-md transition-all", timeframe === "monthly" ? "bg-[var(--color-bg-surface)] text-white shadow-sm border border-white/[0.05]" : "text-zinc-500 hover:text-zinc-300")}>Monthly</button>
            </div>
            <AssetFormDialog mode="create" onSaved={() => refreshDashboard()} trigger={<Button variant="accent" className="h-8 px-3 text-xs font-medium"><Plus className="mr-1.5 h-3.5 w-3.5" />New Asset</Button>} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {statCards.map((card) => (<Card key={card.title} className="p-4 border border-white/[0.06] bg-[var(--color-bg-surface)] rounded-xl hover:bg-white/[0.02] transition-colors"><div className="flex items-center justify-between"><div className="min-w-0"><p className="text-xs text-zinc-400 uppercase tracking-wider">{card.title}</p><p className="text-2xl font-bold text-white mt-1">{card.value}</p><div className="flex items-center gap-1 mt-1">{card.trendDirection === "up" && <span className="text-emerald-400 text-xs">↑</span>}{card.trendDirection === "down" && <span className="text-red-400 text-xs">↓</span>}<span className="text-xs text-zinc-500">{card.trendLabel}</span></div></div><div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", card.iconBgClassName)}>{card.icon}</div></div></Card>))}
        </div>
        <Card className="p-3 border border-white/[0.06] bg-[var(--color-bg-surface)] rounded-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
            <AssetFormDialog mode="create" onSaved={() => refreshDashboard()} trigger={<button className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors border border-transparent hover:border-white/[0.06]"><Plus className="w-4 h-4" />New Asset</button>} />
            <Link href="/dashboard/assets" className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors border border-transparent hover:border-white/[0.06]"><Upload className="w-4 h-4" />Upload Files</Link>
            <Link href="/dashboard/clients" className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors border border-transparent hover:border-white/[0.06]"><FolderPlus className="w-4 h-4" />Add Client</Link>
            <Link href="/dashboard/kanban" className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors border border-transparent hover:border-white/[0.06]"><KanbanSquare className="w-4 h-4" />View Kanban</Link>
          </div>
        </Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="p-5 border border-white/[0.06] bg-[var(--color-bg-surface)] rounded-xl flex flex-col"><h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider text-center mb-4">Reels Overview</h3><div className="flex-1 flex flex-col justify-between"><div><div className="flex items-center justify-between mb-3"><span className="text-2xl font-bold text-white">{deliverablesStats.reels.completed} / {deliverablesStats.reels.planned}</span><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">{deliverablesStats.reels.pct}%</span></div><div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${deliverablesStats.reels.pct}%` }} /></div></div><div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/[0.06] text-center"><div><p className="text-sm font-bold text-white">{deliverablesStats.reels.planned}</p><p className="text-xs text-zinc-500 mt-0.5">Planned</p></div><div><p className="text-sm font-bold text-white">{deliverablesStats.reels.completed}</p><p className="text-xs text-zinc-500 mt-0.5">Published</p></div><div><p className="text-sm font-bold text-white">{deliverablesStats.reels.remaining}</p><p className="text-xs text-zinc-500 mt-0.5">Remaining</p></div></div></div></Card>
          <Card className="p-5 border border-white/[0.06] bg-[var(--color-bg-surface)] rounded-xl flex flex-col"><h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider text-center mb-4">Posters Overview</h3><div className="flex-1 flex flex-col justify-between"><div><div className="flex items-center justify-between mb-3"><span className="text-2xl font-bold text-white">{deliverablesStats.posters.completed} / {deliverablesStats.posters.planned}</span><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">{deliverablesStats.posters.pct}%</span></div><div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${deliverablesStats.posters.pct}%` }} /></div></div><div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/[0.06] text-center"><div><p className="text-sm font-bold text-white">{deliverablesStats.posters.planned}</p><p className="text-xs text-zinc-500 mt-0.5">Planned</p></div><div><p className="text-sm font-bold text-white">{deliverablesStats.posters.completed}</p><p className="text-xs text-zinc-500 mt-0.5">Published</p></div><div><p className="text-sm font-bold text-white">{deliverablesStats.posters.remaining}</p><p className="text-xs text-zinc-500 mt-0.5">Remaining</p></div></div></div></Card>
          <Card className="p-5 border border-white/[0.06] bg-[var(--color-bg-surface)] rounded-xl flex flex-col"><h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider text-center mb-4">Asset Status Breakdown</h3><div className="flex-1 flex flex-col justify-center space-y-0">{assetStatusBreakdown.map((status) => { let dotColor = "#525252"; if (status.label === "Revision") dotColor = "#ca8a04"; else if (status.label === "Approved") dotColor = "#16a34a"; else if (status.label === "Published") dotColor = "#3b82f6"; return (<div key={status.label} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"><div className="flex items-center gap-2.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} /><span className="text-sm text-zinc-300">{status.label}</span></div><span className="text-sm font-medium text-white">{status.count}</span></div>) })}</div></Card>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><Card className="border border-white/[0.06] bg-[var(--color-bg-surface)] rounded-xl"><div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]"><h3 className="text-sm font-medium text-white">Top Active Clients</h3></div><div className="overflow-x-auto overflow-y-auto max-h-[320px]"><table className="w-full text-left border-collapse"><thead className="sticky top-0 bg-[var(--color-bg-surface)]"><tr className="border-b border-white/[0.06] text-xs font-medium uppercase tracking-wider text-zinc-400"><th className="py-2.5 px-4">Client</th><th className="py-2.5 px-4 text-center">Goal</th><th className="py-2.5 px-4 text-center">Done</th><th className="py-2.5 px-4 text-center">Left</th><th className="py-2.5 px-4 text-center">Progress</th><th className="py-2.5 px-4 text-right">Next Publish</th></tr></thead><tbody>{clientPerformance.length > 0 ? clientPerformance.map((item) => { const pctBadge = item.pct >= 75 ? "bg-emerald-500/12 text-emerald-400" : item.pct >= 40 ? "bg-amber-500/12 text-amber-400" : "bg-red-500/12 text-red-400"; const barColor = item.pct >= 75 ? "bg-emerald-500" : item.pct >= 40 ? "bg-amber-500" : "bg-red-500"; return (<tr key={item.id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.01] transition-colors"><td className="py-2.5 px-4 text-sm font-medium text-white"><Link href={`/dashboard/clients/${item.id}`} className="hover:underline">{item.name}</Link></td><td className="py-2.5 px-4 text-center text-sm text-zinc-300">{item.goal}</td><td className="py-2.5 px-4 text-center text-sm text-emerald-400 font-medium">{item.completed}</td><td className="py-2.5 px-4 text-center text-sm text-zinc-300">{item.remaining}</td><td className="py-2.5 px-4 text-center"><div className="flex items-center justify-center gap-2"><span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", pctBadge)}>{item.pct}%</span><div className="h-1 w-12 bg-white/[0.06] rounded-full overflow-hidden hidden sm:block"><div className={cn("h-full rounded-full", barColor)} style={{ width: `${item.pct}%` }} /></div></div></td><td className="py-2.5 px-4 text-right text-xs text-zinc-500">{item.nextPublishDate ? new Date(item.nextPublishDate).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : <span className="text-zinc-600">None</span>}</td></tr>) }) : (<tr><td colSpan={6} className="py-12 text-center text-sm text-zinc-500">No active clients found.</td></tr>)}</tbody></table></div></Card></div>
          <div><Card className="border border-white/[0.06] bg-[var(--color-bg-surface)] rounded-xl"><div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]"><h3 className="text-sm font-medium text-white">{timeframe === "weekly" ? "Weekly Goals" : "Monthly Goals"}</h3></div><div className="p-4 space-y-2.5">{clients.length > 0 ? clients.slice(0, 8).map((client) => { const goal = timeframe === "weekly" ? (client.weeklyGoal ?? 0) : (client.monthlyDeliverables ?? 0); const done = timeframe === "weekly" ? (client.weeklyCompleted ?? 0) : (client.completedDeliverables ?? 0); const pct = goal > 0 ? Math.round((Math.min(done, goal) / goal) * 100) : 0; return (<div key={client.id} className="flex items-center justify-between gap-3"><div className="text-sm font-medium text-zinc-300 truncate w-24 shrink-0">{client.name}</div><div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} /></div><div className="text-xs text-zinc-500 w-12 text-right shrink-0">{done}/{goal}</div></div>) }) : (<div className="py-8 text-center text-sm text-zinc-500">No clients to display</div>)}</div></Card></div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><Card className="border border-white/[0.06] bg-[var(--color-bg-surface)] rounded-xl"><div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]"><h3 className="text-sm font-medium text-white">Recent Activity</h3><Link href="/dashboard/logs" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">View Logs</Link></div><div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4"><div className="rounded-lg bg-white/[0.02] p-4 border border-white/[0.04] text-center"><p className="text-xs font-medium uppercase tracking-wider text-emerald-400 mb-1">Uploads</p><p className="text-2xl font-bold text-white">{activitySummary.uploads}</p></div><div className="rounded-lg bg-white/[0.02] p-4 border border-white/[0.04] text-center"><p className="text-xs font-medium uppercase tracking-wider text-amber-400 mb-1">Revisions</p><p className="text-2xl font-bold text-white">{activitySummary.revisions}</p></div><div className="rounded-lg bg-white/[0.02] p-4 border border-white/[0.04] text-center"><p className="text-xs font-medium uppercase tracking-wider text-emerald-400 mb-1">Approvals</p><p className="text-2xl font-bold text-white">{activitySummary.approvals}</p></div><div className="rounded-lg bg-white/[0.02] p-4 border border-white/[0.04] text-center"><p className="text-xs font-medium uppercase tracking-wider text-red-400 mb-1">Pending</p><p className="text-2xl font-bold text-white">{pendingApprovals}</p></div></div></Card></div>
          <div><Card className="border border-white/[0.06] bg-[var(--color-bg-surface)] rounded-xl"><div className="px-5 py-4 border-b border-white/[0.06]"><h3 className="text-sm font-medium text-white">Clients</h3><p className="text-xs text-zinc-500 mt-0.5">Quick access</p></div><div className="flex flex-wrap gap-2 p-4">{clientChips.map((client) => (<Link key={client.id} href={`/dashboard/clients/${client.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors"><span className="truncate max-w-[8rem]">{client.name}</span><span className="text-zinc-500">{client.completedDeliverables}/{client.monthlyDeliverables}</span></Link>))}</div></Card></div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
