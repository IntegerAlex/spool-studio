import { countClients, listClients } from '@/repositories/clients-repository';
import { listDashboardAssetSummaries, listAssetsByIds } from '@/repositories/assets-repository';
import { listRecentActivity } from '@/repositories/asset-activity-repository';
import { getClients } from '@/services/clients-service';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

export interface DashboardSummary {
  totalAssets: number;
  pendingApprovals: number;
  approvedAssets: number;
  upcomingUploads: number;
  totalClients: number;
  uploadedThisMonth: number;
  assetStatusBreakdown: Array<{ label: 'Draft' | 'Revision' | 'Approved' | 'Published'; count: number }>;
  recentActivity: Array<{
    id: string;
    kind: 'asset' | 'client';
    href: string;
    title: string;
    detail: string;
    timestamp: string;
    iconKind: 'upload' | 'revision' | 'approval' | 'status' | 'client';
  }>;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getStatusBucket(status: string): 'Draft' | 'Revision' | 'Approved' | 'Published' | null {
  switch (status) {
    case 'draft':
    case 'uploading':
    case 'uploaded':
    case 'processing':
    case 'in_design':
    case 'ready_for_review':
      return 'Draft';
    case 'revision_requested':
      return 'Revision';
    case 'approved':
    case 'scheduled':
      return 'Approved';
    case 'published':
      return 'Published';
    default:
      return null;
  }
}

function getActivityIconKind(
  action: string,
  metadata: Record<string, unknown>
): 'upload' | 'revision' | 'approval' | 'status' {
  if (action === 'asset_created' || action === 'file_uploaded') {
    return 'upload';
  }
  if (action === 'revision_created' || action === 'revision_activated') {
    return 'revision';
  }
  if (action === 'status_changed') {
    const to = typeof metadata.to === 'string' ? metadata.to : null;
    if (to === 'approved' || to === 'published') {
      return 'approval';
    }
  }
  return 'status';
}

function getActivityDetail(action: string, metadata: Record<string, unknown>): string {
  switch (action) {
    case 'asset_created':
      return 'asset created';
    case 'file_uploaded':
      return 'file uploaded';
    case 'revision_created':
      return 'revision uploaded';
    case 'revision_activated':
      return 'revision activated';
    case 'assignment_changed':
      return 'assignment changed';
    case 'status_changed': {
      const to = typeof metadata.to === 'string' ? metadata.to : null;
      if (!to) {
        return 'status changed';
      }
      return `status changed to ${to.replace(/_/g, ' ')}`;
    }
    default:
      return action.replace(/_/g, ' ');
  }
}

function buildRecentActivity(
  assetLogs: Awaited<ReturnType<typeof listRecentActivity>>,
  assets: Awaited<ReturnType<typeof listAssets>>,
  clients: Awaited<ReturnType<typeof listClients>>
): DashboardSummary['recentActivity'] {
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const items: DashboardSummary['recentActivity'] = [];

  for (const entry of assetLogs) {
    const asset = assetById.get(entry.asset_id);
    if (!asset) {
      continue;
    }

    const metadata = (entry.metadata as Record<string, unknown>) ?? {};
    const detail = getActivityDetail(entry.action, metadata);
    const timestamp = new Date(entry.created_at);

    items.push({
      id: `asset-${entry.id}`,
      kind: 'asset',
      href: `/dashboard/assets/${asset.id}`,
      title: asset.title,
      detail: `${detail} • ${asset.type} asset`,
      timestamp: timestamp.toISOString(),
      iconKind: getActivityIconKind(entry.action, metadata),
    });
  }

  for (const client of clients) {
    const timestamp = new Date(client.updated_at);
    const isCreateEvent = client.created_at === client.updated_at;

    items.push({
      id: `client-${client.id}-${client.updated_at}`,
      kind: 'client',
      href: `/dashboard/clients/${client.id}`,
      title: client.name,
      detail: isCreateEvent ? 'client created' : 'client updated',
      timestamp: timestamp.toISOString(),
      iconKind: 'client',
    });
  }

  return items.sort((left, right) => {
    return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
  });
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const [rawClientCountResult, repositoryClientsResult, serviceClientsResult, dashboardSummaryResult, activityResult] =
      await Promise.allSettled([
        countClients(),
        listClients(),
        getClients(),
        listDashboardAssetSummaries(),
        listRecentActivity(undefined, { limit: 50 }),
    ]);

    const rawSupabaseCount =
      rawClientCountResult.status === 'fulfilled' ? rawClientCountResult.value : 0;
    const repositoryClients =
      repositoryClientsResult.status === 'fulfilled' ? repositoryClientsResult.value : [];
    const serviceClients =
      serviceClientsResult.status === 'fulfilled' ? serviceClientsResult.value : [];
    const dashboardSummaries =
      dashboardSummaryResult.status === 'fulfilled' ? dashboardSummaryResult.value : [];
    const assetLogs = activityResult.status === 'fulfilled' ? activityResult.value : [];

    console.info('[dashboard-debug][summary]', {
      stage: 'dashboard-service-inputs',
      rawSupabaseCount,
      repositoryResultCount: repositoryClients.length,
      serviceResultCount: serviceClients.length,
      dashboardSummaryCount: dashboardSummaries.length,
      activityCount: assetLogs.length,
    });

    const now = new Date();
    const monthStart = getMonthStart(now);
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);

    // Use dashboard summaries for aggregate computations (smaller payload)
    const activeAssets = (dashboardSummaries as any[]).filter((asset) => asset.status !== 'archived' && asset.status !== 'failed');

    let pendingApprovals = 0;
    let upcomingUploads = 0;
    let uploadedThisMonth = 0;
    let approvedAssets = 0;
    const bucketCounts = new Map<'Draft' | 'Revision' | 'Approved' | 'Published', number>([
      ['Draft', 0],
      ['Revision', 0],
      ['Approved', 0],
      ['Published', 0],
    ]);

    for (const asset of activeAssets) {
      const bucket = getStatusBucket(asset.status);
      if (bucket) {
        bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
      }

      if (
        asset.status === 'draft' ||
        asset.status === 'in_design' ||
        asset.status === 'ready_for_review' ||
        asset.status === 'revision_requested'
      ) {
        pendingApprovals += 1;
      }

      if (asset.status === 'approved' && asset.publish_date) {
        const timePart = asset.publish_time ?? '00:00:00';
        const publishAt = new Date(`${asset.publish_date}T${timePart}`);
        if (publishAt >= now && publishAt <= nextWeek) {
          upcomingUploads += 1;
        }
      }

      if (asset.status === 'published' && asset.published_at) {
        if (new Date(asset.published_at) >= monthStart) {
          uploadedThisMonth += 1;
        }
      }

      if (asset.status === 'approved') {
        approvedAssets += 1;
      }
    }

    // Build enriched recentActivity by fetching only the small set of assets referenced in activity
    const activityAssetIds = Array.from(new Set(assetLogs.map((a) => a.asset_id).filter(Boolean)));
    let activityAssets: any[] = [];
    try {
      activityAssets = await listAssetsByIds(activityAssetIds);
    } catch (e) {
      // fallback to empty
      activityAssets = [];
    }

    return {
      totalAssets: activeAssets.length,
      pendingApprovals,
      approvedAssets,
      upcomingUploads,
      totalClients: Math.max(rawSupabaseCount, repositoryClients.length, serviceClients.length),
      uploadedThisMonth,
      assetStatusBreakdown: [
        { label: 'Draft', count: bucketCounts.get('Draft') ?? 0 },
        { label: 'Revision', count: bucketCounts.get('Revision') ?? 0 },
        { label: 'Approved', count: bucketCounts.get('Approved') ?? 0 },
        { label: 'Published', count: bucketCounts.get('Published') ?? 0 },
      ],
      recentActivity: buildRecentActivity(assetLogs, activityAssets as any, repositoryClients).slice(0, 5),
    };
  } catch (error) {
    logProductionRuntimeError('dashboard-summary', error);
    console.info('[dashboard-debug][summary]', {
      stage: 'dashboard-service-error',
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      totalAssets: 0,
      pendingApprovals: 0,
      approvedAssets: 0,
      upcomingUploads: 0,
      totalClients: 0,
      uploadedThisMonth: 0,
      assetStatusBreakdown: [
        { label: 'Draft', count: 0 },
        { label: 'Revision', count: 0 },
        { label: 'Approved', count: 0 },
        { label: 'Published', count: 0 },
      ],
      recentActivity: [],
    };
  }
}
