import { unstable_cache } from 'next/cache';
import { countClients } from '@/repositories/clients-repository';
import { listDashboardAssetSummaries } from '@/repositories/assets-repository';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

export interface DashboardSummary {
  pendingApprovals: number;
  upcomingUploads: number;
  totalClients: number;
  uploadedThisMonth: number;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

const getDashboardSummaryCached = unstable_cache(
  async (): Promise<DashboardSummary> => {
    try {
      const [totalClients, assetSummaries] = await Promise.all([
        countClients(),
        listDashboardAssetSummaries(),
      ]);

      const now = new Date();
      const monthStart = getMonthStart(now);
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);

      let pendingApprovals = 0;
      let upcomingUploads = 0;
      let uploadedThisMonth = 0;

      for (const asset of assetSummaries) {
        if (
          asset.status === 'draft' ||
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
      }

      return {
        pendingApprovals,
        upcomingUploads,
        totalClients,
        uploadedThisMonth,
      };
    } catch (error) {
      logProductionRuntimeError('dashboard-summary', error);
      return {
        pendingApprovals: 0,
        upcomingUploads: 0,
        totalClients: 0,
        uploadedThisMonth: 0,
      };
    }
  },
  ['dashboard-summary'],
  { revalidate: 30 }
);

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return getDashboardSummaryCached();
}
