import { getClientById } from '@/repositories/clients-repository';
import { listClientAssetsForReport } from '@/repositories/reports-repository';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export interface MonthlyReportPayload {
  client: {
    id: string;
    name: string;
    instagramHandle: string;
    brandColor?: string;
    contractStartDate?: string | null;
    contractEndDate?: string | null;
  };
  period: {
    month: string;
    monthNumber: number;
    year: number;
    startDate: string;
    endDate: string;
  };
  summary: {
    postersDelivered: number;
    reelsDelivered: number;
    totalDelivered: number;
    monthlyTarget: number;
    completionRate: number;
  };
  assets: Array<{
    id: string;
    title: string;
    type: 'reel' | 'poster';
    status: string;
    uploadedAt: string | null;
    approvedAt: string | null;
    publishedAt: string | null;
    driveFileUrl: string | null;
  }>;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export async function generateMonthlyReport(
  clientId: string,
  month: number,
  year: number,
  client?: SupabaseClient<Database>
): Promise<MonthlyReportPayload | null> {
  const clientRecord = await getClientById(clientId, client);
  if (!clientRecord) {
    return null;
  }

  // Define date range in UTC to cover the requested calendar month
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  // Query published assets within date range from repository
  const dbAssets = await listClientAssetsForReport(clientId, startDate, endDate, client);

  const postersDelivered = dbAssets.filter((asset) => asset.type === 'poster').length;
  const reelsDelivered = dbAssets.filter((asset) => asset.type === 'reel').length;
  const totalDelivered = postersDelivered + reelsDelivered;

  // monthlyTarget = monthly_goal, fallback to reels target + posts target
  const monthlyTarget =
    clientRecord.monthly_goal && clientRecord.monthly_goal > 0
      ? clientRecord.monthly_goal
      : (clientRecord.monthly_reels_target ?? 0) + (clientRecord.monthly_posts_target ?? 0);

  const completionRate =
    monthlyTarget > 0 ? Math.round((totalDelivered / monthlyTarget) * 100) : 0;

  const monthName = MONTH_NAMES[month - 1] || String(month);

  const assets = dbAssets.map((asset) => {
    // Map dates properly resolving legacy fallback if published_at is not present
    let resolvedPublishTime: string | null = null;
    if (asset.published_at) {
      resolvedPublishTime = new Date(asset.published_at).toISOString();
    } else if (asset.publish_date) {
      const timePart = asset.publish_time ?? '00:00:00';
      resolvedPublishTime = new Date(`${asset.publish_date}T${timePart}`).toISOString();
    } else {
      resolvedPublishTime = new Date(asset.created_at).toISOString();
    }

    return {
      id: asset.id,
      title: asset.title,
      type: asset.type,
      status: asset.status,
      uploadedAt: asset.uploaded_at ? new Date(asset.uploaded_at).toISOString() : null,
      approvedAt: asset.approved_at ? new Date(asset.approved_at).toISOString() : null,
      publishedAt: resolvedPublishTime,
      driveFileUrl: asset.drive_file_url || null,
    };
  });

  return {
    client: {
      id: clientRecord.id,
      name: clientRecord.name,
      instagramHandle: clientRecord.instagram_handle ? `@${clientRecord.instagram_handle.replace(/^@/, '')}` : '',
      brandColor: clientRecord.brand_color || undefined,
      contractStartDate: clientRecord.contract_start_date,
      contractEndDate: clientRecord.contract_end_date,
    },
    period: {
      month: monthName,
      monthNumber: month,
      year,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    summary: {
      postersDelivered,
      reelsDelivered,
      totalDelivered,
      monthlyTarget,
      completionRate,
    },
    assets,
  };
}
