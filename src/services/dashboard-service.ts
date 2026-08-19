import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { listRecentActivity } from "@/repositories/asset-activity-repository"
import {
  listAssetSummaries,
  listAssetsByIds,
} from "@/repositories/assets-repository"
import type { listClients } from "@/repositories/clients-repository"
import { getClients } from "@/services/clients-service"
import type { Client } from "@/types/index"

export interface ClientPerformanceItem {
  id: string
  name: string
  plannedDeliverables: number
  completedDeliverables: number
  completionRate: number
  nextPublishDate: string | null
}

export interface DashboardSummary {
  totalAssets: number
  pendingApprovals: number
  approvedAssets: number
  upcomingUploads: number
  totalClients: number
  uploadedThisMonth: number
  assetStatusBreakdown: Array<{
    label: "Draft" | "Revision" | "Approved" | "Published"
    count: number
  }>
  recentActivity: Array<{
    id: string
    kind: "asset" | "client"
    href: string
    title: string
    detail: string
    timestamp: string
    iconKind:
      | "upload"
      | "revision"
      | "approval"
      | "status"
      | "client"
      | "publish"
  }>
  totalDeliverables: number
  totalReelsPlanned: number
  totalReelsPublished: number
  totalPostersPlanned: number
  totalPostersPublished: number
  publishedContentCount: number
  completionPercentage: number
  clientPerformance: ClientPerformanceItem[]
  clients?: Client[]
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getStatusBucket(
  status: string,
): "Draft" | "Revision" | "Approved" | "Published" | null {
  switch (status) {
    case "draft":
    case "uploading":
    case "uploaded":
    case "processing":
    case "in_design":
    case "ready_for_review":
      return "Draft"
    case "revision_requested":
      return "Revision"
    case "approved":
    case "scheduled":
      return "Approved"
    case "published":
      return "Published"
    default:
      return null
  }
}

function getActivityIconKind(
  action: string,
  metadata: Record<string, unknown>,
): "upload" | "revision" | "approval" | "status" | "publish" {
  if (action === "asset_created" || action === "file_uploaded") {
    return "upload"
  }
  if (
    action === "revision_created" ||
    action === "revision_activated" ||
    action === "revision_requested"
  ) {
    return "revision"
  }
  if (action === "status_changed") {
    const to = typeof metadata.to === "string" ? metadata.to : null
    if (to === "published") {
      return "publish"
    }
    if (to === "approved" || to === "scheduled") {
      return "approval"
    }
  }
  return "status"
}

function getActivityDetail(
  action: string,
  metadata: Record<string, unknown>,
): string {
  switch (action) {
    case "asset_created":
      return "asset created"
    case "file_uploaded":
      return "file uploaded"
    case "revision_created":
      return "revision uploaded"
    case "revision_activated":
      return "revision activated"
    case "assignment_changed":
      return "assignment changed"
    case "status_changed": {
      const to = typeof metadata.to === "string" ? metadata.to : null
      if (!to) {
        return "status changed"
      }
      return `status changed to ${to.replace(/_/g, " ")}`
    }
    default:
      return action.replace(/_/g, " ")
  }
}

function buildRecentActivity(
  assetLogs: Awaited<ReturnType<typeof listRecentActivity>>,
  assets: any[],
  clients: Awaited<ReturnType<typeof listClients>>,
): DashboardSummary["recentActivity"] {
  const assetById = new Map(assets.map((asset) => [asset.id, asset]))
  const items: DashboardSummary["recentActivity"] = []

  for (const entry of assetLogs) {
    const asset = assetById.get(entry.asset_id)
    if (!asset) {
      continue
    }

    const metadata = (entry.metadata as Record<string, unknown>) ?? {}
    const detail = getActivityDetail(entry.action, metadata)
    const timestamp = new Date(entry.created_at)

    items.push({
      id: `asset-${entry.id}`,
      kind: "asset",
      href: `/dashboard/assets/${asset.id}`,
      title: asset.title,
      detail: `${detail} • ${asset.type} asset`,
      timestamp: timestamp.toISOString(),
      iconKind: getActivityIconKind(entry.action, metadata),
    })
  }

  for (const client of clients as any[]) {
    const rawUpdated = client.updatedAt ?? client.updated_at
    const rawCreated = client.createdAt ?? client.created_at
    const timestamp = new Date(rawUpdated)
    const isCreateEvent =
      rawCreated && rawUpdated
        ? new Date(rawCreated).getTime() === new Date(rawUpdated).getTime()
        : false

    items.push({
      id: `client-${client.id}-${rawUpdated}`,
      kind: "client",
      href: `/dashboard/clients/${client.id}`,
      title: client.name,
      detail: isCreateEvent ? "client created" : "client updated",
      timestamp: timestamp.toISOString(),
      iconKind: "client",
    })
  }

  return items.sort((left, right) => {
    return (
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    )
  })
}

function getWeekStart(date: Date) {
  // ISO week start: Monday
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  )
  const day = d.getUTCDay()
  const diff = (day + 6) % 7 // days since Monday
  d.setUTCDate(d.getUTCDate() - diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    // Stage 1: Fetch asset summaries and recent activity logs in parallel
    const [assetSummaries, assetLogs] = await Promise.all([
      listAssetSummaries(),
      listRecentActivity(undefined, { limit: 50 }),
    ])

    // Stage 2: Fetch clients using the pre-fetched asset summaries
    const serviceClients = await getClients(assetSummaries)
    const repositoryClients = serviceClients
    const rawSupabaseCount = serviceClients.length

    const now = new Date()
    const weekStart = getWeekStart(now)
    const monthStart = getMonthStart(now)
    const nextWeek = new Date(now)
    nextWeek.setDate(now.getDate() + 7)

    // Use pre-fetched asset summaries for aggregate computations
    const activeAssets = (assetSummaries as any[]).filter(
      (asset) => asset.status !== "archived" && asset.status !== "failed",
    )

    // Pre-group assets by client_id for O(1) lookups in the client loop
    const assetsByClientId = new Map<string, any[]>()
    for (const asset of activeAssets) {
      const cid = asset.client_id
      if (!cid) continue
      const list = assetsByClientId.get(cid)
      if (list) {
        list.push(asset)
      } else {
        assetsByClientId.set(cid, [asset])
      }
    }

    let pendingApprovals = 0
    let upcomingUploads = 0
    let uploadedThisMonth = 0
    let approvedAssets = 0
    let _totalReelsPublished = 0 // weekly
    let _totalPostersPublished = 0 // weekly
    let publishedContentCount = 0 // all time

    const bucketCounts = new Map<
      "Draft" | "Revision" | "Approved" | "Published",
      number
    >([
      ["Draft", 0],
      ["Revision", 0],
      ["Approved", 0],
      ["Published", 0],
    ])

    for (const asset of activeAssets) {
      const bucket = getStatusBucket(asset.status)
      if (bucket) {
        bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1)
      }

      if (
        asset.status === "draft" ||
        asset.status === "in_design" ||
        asset.status === "ready_for_review" ||
        asset.status === "revision_requested"
      ) {
        pendingApprovals += 1
      }

      if (asset.status === "approved" && asset.publish_date) {
        const timePart = asset.publish_time ?? "00:00:00"
        const publishAt = new Date(`${asset.publish_date}T${timePart}`)
        if (publishAt >= now && publishAt <= nextWeek) {
          upcomingUploads += 1
        }
      }

      if (asset.status === "published" && asset.published_at) {
        if (new Date(asset.published_at) >= monthStart) {
          uploadedThisMonth += 1
        }
      }

      if (asset.status === "approved") {
        approvedAssets += 1
      }

      if (asset.status === "published") {
        publishedContentCount += 1 // all time
      }

      // Weekly published counts for Reels & Posters
      if (asset.status === "published" && asset.created_at) {
        const created = new Date(asset.created_at)
        if (created >= weekStart && created <= now) {
          if (asset.type === "reel") {
            _totalReelsPublished += 1
          } else if (asset.type === "poster") {
            _totalPostersPublished += 1
          }
        }
      }
    }

    // Aggregates over all clients using getClients() data as source of truth
    let totalPostersPlanned = 0
    let totalReelsPlanned = 0
    let totalPostersCompleted = 0
    let totalReelsCompleted = 0
    let totalDeliverables = 0
    let totalCompleted = 0

    const clientPerformance: ClientPerformanceItem[] = []

    // Diagnostics / Trace logging for clients-source
    for (const client of serviceClients) {
      const pPosters = client.weeklyPosterGoal ?? 0
      const pReels = client.weeklyReelGoal ?? 0
      const cPosters = client.weeklyCompletedPosters ?? 0
      const cReels = client.weeklyCompletedReels ?? 0
      const planned = pPosters + pReels
      const completed = cPosters + cReels

      totalPostersPlanned += pPosters
      totalReelsPlanned += pReels
      totalPostersCompleted += cPosters
      totalReelsCompleted += cReels
      totalDeliverables += planned
      totalCompleted += completed

      // Get next publish date (earliest approved/scheduled asset publish date in the future)
      const clientAssets = assetsByClientId.get(client.id) ?? []
      const futureDates = clientAssets
        .map((asset) => {
          if (asset.publish_date) {
            const timePart = asset.publish_time ?? "00:00:00"
            return new Date(`${asset.publish_date}T${timePart}`)
          }
          return null
        })
        .filter((d): d is Date => d !== null && d.getTime() >= now.getTime())

      const nextPublishDate =
        futureDates.length > 0
          ? new Date(
              Math.min(...futureDates.map((d) => d.getTime())),
            ).toISOString()
          : null

      clientPerformance.push({
        id: client.id,
        name: client.name,
        plannedDeliverables: planned,
        completedDeliverables: completed,
        completionRate:
          planned > 0 ? Math.round((completed / planned) * 100) : 0,
        nextPublishDate,
      })
    }

    // Sort clientPerformance by nearest deadline
    clientPerformance.sort((a, b) => {
      if (!a.nextPublishDate && !b.nextPublishDate) return 0
      if (!a.nextPublishDate) return 1
      if (!b.nextPublishDate) return -1
      return (
        new Date(a.nextPublishDate).getTime() -
        new Date(b.nextPublishDate).getTime()
      )
    })

    const completionPercentage =
      totalDeliverables > 0
        ? Math.round((totalCompleted / totalDeliverables) * 100)
        : 0

    // Build enriched recentActivity by fetching only the small set of assets referenced in activity
    const activityAssetIds = Array.from(
      new Set(assetLogs.map((a) => a.asset_id).filter(Boolean)),
    )
    let activityAssets: any[] = []
    try {
      activityAssets = await listAssetsByIds(activityAssetIds)
    } catch (_e) {
      // fallback to empty
      activityAssets = []
    }

    return {
      totalAssets: activeAssets.length,
      pendingApprovals,
      approvedAssets,
      upcomingUploads,
      totalClients: Math.max(
        rawSupabaseCount,
        repositoryClients.length,
        serviceClients.length,
      ),
      uploadedThisMonth,
      assetStatusBreakdown: [
        { label: "Draft", count: bucketCounts.get("Draft") ?? 0 },
        { label: "Revision", count: bucketCounts.get("Revision") ?? 0 },
        { label: "Approved", count: bucketCounts.get("Approved") ?? 0 },
        { label: "Published", count: bucketCounts.get("Published") ?? 0 },
      ],
      recentActivity: buildRecentActivity(
        assetLogs,
        activityAssets as any,
        repositoryClients as any,
      ).slice(0, 50),
      totalDeliverables,
      totalReelsPlanned,
      totalReelsPublished: totalReelsCompleted,
      totalPostersPlanned,
      totalPostersPublished: totalPostersCompleted,
      publishedContentCount,
      completionPercentage,
      clientPerformance,
      clients: serviceClients,
    }
  } catch (error) {
    logProductionRuntimeError("dashboard-summary", error)
    return {
      totalAssets: 0,
      pendingApprovals: 0,
      approvedAssets: 0,
      upcomingUploads: 0,
      totalClients: 0,
      uploadedThisMonth: 0,
      assetStatusBreakdown: [
        { label: "Draft", count: 0 },
        { label: "Revision", count: 0 },
        { label: "Approved", count: 0 },
        { label: "Published", count: 0 },
      ],
      recentActivity: [],
      totalDeliverables: 0,
      totalReelsPlanned: 0,
      totalReelsPublished: 0,
      totalPostersPlanned: 0,
      totalPostersPublished: 0,
      publishedContentCount: 0,
      completionPercentage: 0,
      clientPerformance: [],
      clients: [],
    }
  }
}
