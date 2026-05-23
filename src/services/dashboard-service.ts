import { listClients } from '@/repositories/clients-repository';
import { listAssetSummaries } from '@/repositories/assets-repository';
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

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const [clients, assetSummaries] = await Promise.all([
      listClients(),
      listAssetSummaries(),
    ]);

    const now = new Date();
    const monthStart = getMonthStart(now);
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);

    const pendingApprovals = assetSummaries.filter(
      (asset) => asset.status === 'ready_for_review'
    ).length;

    const upcomingUploads = assetSummaries.filter((asset) => {
      if (asset.status !== 'scheduled' || !asset.scheduled_at) {
        return false;
      }
      const scheduledAt = new Date(asset.scheduled_at);
      return scheduledAt >= now && scheduledAt <= nextWeek;
    }).length;

    const uploadedThisMonth = assetSummaries.filter((asset) => {
      if (asset.status !== 'uploaded' || !asset.created_at) {
        return false;
      }
      return new Date(asset.created_at) >= monthStart;
    }).length;

    return {
      pendingApprovals,
      upcomingUploads,
      totalClients: clients.length,
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
}
