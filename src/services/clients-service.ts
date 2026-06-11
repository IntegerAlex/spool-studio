import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Client } from '@/types/index';
import {
  deleteClient as deleteClientRow,
  getClientById,
  insertClient,
  listClients,
  updateClient as updateClientRow,
} from '@/repositories/clients-repository';
import { listAssetSummaries, listAssetsByClientId } from '@/repositories/assets-repository';
import { getWeeklyCountsGroupedByClient } from '@/repositories/assets-repository';
import { checkClientGoalsMigration } from '@/lib/migration-check';
import { createClientDriveFolders } from '@/integrations/google-drive/folder-service';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

export interface ClientInput {
  name: string;
  slug: string;
  instagramHandle?: string;
  brandColor?: string;
  monthlyReelsTarget?: number;
  monthlyPostsTarget?: number;
  monthlyGoal?: number;
  weeklyGoal?: number;
  weeklyPosterGoal?: number;
  weeklyReelGoal?: number;
  contractStartDate?: string;
  contractEndDate?: string;
}

function normalizeInstagramHandle(handle?: string | null): string {
  if (!handle) {
    return '';
  }
  return handle.startsWith('@') ? handle : `@${handle}`;
}

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getWeekStart(date: Date) {
  // ISO week start: Monday
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

interface ClientMetrics {
  completedReels: number;
  completedPosters: number;
  pendingApprovals: number;
  pendingRevisions: number;
  completedDeliverables: number;
  weeklyCompleted: number;
  weeklyCompletedReels: number;
  weeklyCompletedPosters: number;
  assignedTeamMembers: Set<string>;
}

function buildClientMetricsMap(
  assetSummaries: Awaited<ReturnType<typeof listAssetSummaries>>,
  monthStart: Date,
  weekStart: Date,
  now: Date
): Map<string, ClientMetrics> {
  const map = new Map<string, ClientMetrics>();
  for (const asset of assetSummaries) {
    const cid = asset.client_id;
    if (!cid) continue;

    let metrics = map.get(cid);
    if (!metrics) {
      metrics = {
        completedReels: 0,
        completedPosters: 0,
        pendingApprovals: 0,
        pendingRevisions: 0,
        completedDeliverables: 0,
        weeklyCompleted: 0,
        weeklyCompletedReels: 0,
        weeklyCompletedPosters: 0,
        assignedTeamMembers: new Set<string>(),
      };
      map.set(cid, metrics);
    }

    const isCompletedStatus = ['uploaded', 'ready_for_review', 'revision_requested', 'approved', 'published', 'scheduled'].includes(asset.status || '');

    if (asset.created_at && isCompletedStatus) {
      const created = new Date(asset.created_at);
      if (created >= weekStart && created <= now) {
        metrics.weeklyCompleted++;
        if (asset.type === 'reel') {
          metrics.weeklyCompletedReels++;
        } else if (asset.type === 'poster') {
          metrics.weeklyCompletedPosters++;
        }
      }
    }

    if (asset.assigned_to) {
      metrics.assignedTeamMembers.add(asset.assigned_to);
    }

    const isCurrentMonth = asset.created_at && new Date(asset.created_at) >= monthStart;
    if (isCompletedStatus && isCurrentMonth) {
      metrics.completedDeliverables++;
      if (asset.type === 'reel') {
        metrics.completedReels++;
      } else if (asset.type === 'poster') {
        metrics.completedPosters++;
      }
    }

    if (asset.status === 'draft' || asset.status === 'ready_for_review') {
      metrics.pendingApprovals++;
    } else if (asset.status === 'revision_requested') {
      metrics.pendingRevisions++;
    }
  }
  return map;
}

function mapClient(
  client: Awaited<ReturnType<typeof getClientById>>,
  assetSummaries: Awaited<ReturnType<typeof listAssetSummaries>>,
  metricsMap?: Map<string, ClientMetrics>
): Client | null {
  if (!client) {
    return null;
  }

  const now = new Date();
  const monthStart = getMonthStart(now);
  const weekStart = getWeekStart(now);

  let metrics: ClientMetrics;

  if (metricsMap) {
    metrics = metricsMap.get(client.id) ?? {
      completedReels: 0,
      completedPosters: 0,
      pendingApprovals: 0,
      pendingRevisions: 0,
      completedDeliverables: 0,
      weeklyCompleted: 0,
      weeklyCompletedReels: 0,
      weeklyCompletedPosters: 0,
      assignedTeamMembers: new Set<string>(),
    };
  } else {
    const clientAssets = assetSummaries.filter((asset) => asset.client_id === client.id);
    const assignedTeam = new Set<string>(
      clientAssets.map((asset) => asset.assigned_to).filter((v): v is string => Boolean(v))
    );
    const completedDeliv = clientAssets.filter((asset) => {
      const isCompletedStatus = ['uploaded', 'ready_for_review', 'revision_requested', 'approved', 'published', 'scheduled'].includes(asset.status || '');
      if (!isCompletedStatus || !asset.created_at) return false;
      return new Date(asset.created_at) >= monthStart;
    });

    metrics = {
      completedReels: completedDeliv.filter((asset) => asset.type === 'reel').length,
      completedPosters: completedDeliv.filter((asset) => asset.type === 'poster').length,
      pendingApprovals: clientAssets.filter((asset) => asset.status === 'draft' || asset.status === 'ready_for_review').length,
      pendingRevisions: clientAssets.filter((asset) => asset.status === 'revision_requested').length,
      completedDeliverables: completedDeliv.length,
      weeklyCompleted: clientAssets.filter((asset) => {
        const isCompletedStatus = ['uploaded', 'ready_for_review', 'revision_requested', 'approved', 'published', 'scheduled'].includes(asset.status || '');
        if (!isCompletedStatus || !asset.created_at) return false;
        const created = new Date(asset.created_at);
        return created >= weekStart && created <= now;
      }).length,
      weeklyCompletedReels: clientAssets.filter((asset) => {
        const isCompletedStatus = ['uploaded', 'ready_for_review', 'revision_requested', 'approved', 'published', 'scheduled'].includes(asset.status || '');
        if (asset.type !== 'reel' || !isCompletedStatus || !asset.created_at) return false;
        const created = new Date(asset.created_at);
        return created >= weekStart && created <= now;
      }).length,
      weeklyCompletedPosters: clientAssets.filter((asset) => {
        const isCompletedStatus = ['uploaded', 'ready_for_review', 'revision_requested', 'approved', 'published', 'scheduled'].includes(asset.status || '');
        if (asset.type !== 'poster' || !isCompletedStatus || !asset.created_at) return false;
        const created = new Date(asset.created_at);
        return created >= weekStart && created <= now;
      }).length,
      assignedTeamMembers: assignedTeam,
    };
  }

  const monthlyDeliverables = client.monthly_goal ?? ((client.monthly_reels_target ?? 0) + (client.monthly_posts_target ?? 0));

  const weeklyPosterGoal = client.weekly_poster_goal ?? 0;
  const weeklyReelGoal = client.weekly_reel_goal ?? 0;
  let weeklyGoal = weeklyPosterGoal + weeklyReelGoal;
  if (weeklyGoal === 0 && (client.weekly_goal ?? 0) > 0) {
    weeklyGoal = client.weekly_goal ?? 0;
  }

  const weeklyRemaining = Math.max(0, weeklyGoal - metrics.weeklyCompleted);

  return {
    id: client.id,
    name: client.name,
    slug: client.slug,
    instagramHandle: normalizeInstagramHandle(client.instagram_handle),
    monthlyDeliverables,
    completedDeliverables: metrics.completedDeliverables,
    weeklyGoal,
    weeklyCompleted: metrics.weeklyCompleted,
    weeklyRemaining,
    assignedTeamMembers: Array.from(metrics.assignedTeamMembers),
    brandColor: client.brand_color ?? undefined,
    driveFolderId: client.drive_folder_id ?? undefined,
    driveFolderUrl: client.drive_folder_url ?? undefined,
    createdAt: new Date(client.created_at),
    updatedAt: new Date(client.updated_at),
    monthlyReelsTarget: client.monthly_reels_target ?? 0,
    monthlyPostsTarget: client.monthly_posts_target ?? 0,
    completedReels: metrics.completedReels,
    completedPosters: metrics.completedPosters,
    pendingApprovals: metrics.pendingApprovals,
    pendingRevisions: metrics.pendingRevisions,
    weeklyPosterGoal,
    weeklyReelGoal,
    weeklyCompletedReels: metrics.weeklyCompletedReels,
    weeklyCompletedPosters: metrics.weeklyCompletedPosters,
    contractStartDate: client.contract_start_date ? new Date(client.contract_start_date) : undefined,
    contractEndDate: client.contract_end_date ? new Date(client.contract_end_date) : undefined,
  };
}

export async function getClients(preFetchedAssetSummaries?: any[]): Promise<Client[]> {
  try {
    const mig = await checkClientGoalsMigration().catch(() => ({ ok: false }));

    const [clients, assetSummaries, weeklyCounts] = await Promise.all([
      listClients(),
      preFetchedAssetSummaries ? Promise.resolve(preFetchedAssetSummaries) : listAssetSummaries(),
      mig.ok
        ? getWeeklyCountsGroupedByClient(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString())
        : Promise.resolve([] as { client_id: string; weekly_count: number }[]),
    ]);

    const weeklyMap = new Map<string, number>(weeklyCounts.map((r) => [r.client_id, Number(r.weekly_count)]));

    const now = new Date();
    const metricsMap = buildClientMetricsMap(assetSummaries, getMonthStart(now), getWeekStart(now), now);

    const mappedClients = clients
      .map((client) => {
        const mapped = mapClient(client, assetSummaries, metricsMap);
        if (!mapped) return null;
        const dbCount = weeklyMap.get(client.id) ?? mapped.weeklyCompleted ?? 0;
        mapped.weeklyCompleted = dbCount;
        mapped.weeklyRemaining = Math.max(0, (mapped.weeklyGoal ?? 0) - dbCount);
        return mapped;
      })
      .filter((client): client is Client => Boolean(client));

    console.info('[dashboard-debug][service]', {
      operation: 'getClients',
      serviceResultCount: mappedClients.length,
      repositoryClientCount: clients.length,
      assetSummaryCount: assetSummaries.length,
    });

    return mappedClients;
  } catch (error) {
    logProductionRuntimeError('clients-loader', error);
    console.info('[dashboard-debug][service]', {
      operation: 'getClients',
      serviceResultCount: 0,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function getClientDetail(clientId: string): Promise<Client | null> {
  try {
    const [client, assetSummaries] = await Promise.all([getClientById(clientId), listAssetSummaries()]);
    const mapped = mapClient(client, assetSummaries);
    if (!mapped) return null;

    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const counts = await getWeeklyCountsGroupedByClient(weekStart.toISOString());
      const found = counts.find((c) => c.client_id === clientId);
      if (found) {
        mapped.weeklyCompleted = Number(found.weekly_count);
        mapped.weeklyRemaining = Math.max(0, (mapped.weeklyGoal ?? 0) - mapped.weeklyCompleted);
      }
    } catch (_e) {
      // fallback to computed value
    }

    return mapped;
  } catch (error) {
    logProductionRuntimeError('client-detail-loader', error, { clientId });
    return null;
  }
}

export async function createClient(input: ClientInput): Promise<Client> {
  console.log("[client-create][payload]", input);
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  const calculatedWeeklyGoal = (input.weeklyPosterGoal ?? 0) + (input.weeklyReelGoal ?? 0);
  const monthlyGoal = input.monthlyGoal ?? ((input.monthlyReelsTarget ?? 0) + (input.monthlyPostsTarget ?? 0));

  const insertData = {
    name: input.name,
    slug: normalizeSlug(input.slug),
    instagram_handle: input.instagramHandle ?? null,
    brand_color: input.brandColor ?? null,
    monthly_reels_target: input.monthlyReelsTarget ?? 0,
    monthly_posts_target: input.monthlyPostsTarget ?? 0,
    monthly_goal: monthlyGoal,
    weekly_goal: calculatedWeeklyGoal || input.weeklyGoal || 0,
    weekly_poster_goal: input.weeklyPosterGoal ?? 0,
    weekly_reel_goal: input.weeklyReelGoal ?? 0,
    created_by: user.id,
    contract_start_date: input.contractStartDate ?? null,
    contract_end_date: input.contractEndDate ?? null,
  };

  console.log("[client-create][insert]", insertData);

  const record = await insertClient(
    insertData,
    supabase
  );

  let updatedRecord = record;

  try {
    console.info('[clients-service] Starting Drive folder provisioning for client', {
      clientId: record.id,
      clientName: record.name,
    });

    const driveFolders = await createClientDriveFolders(record.name);

    console.info('[clients-service] Drive folder provisioning succeeded', {
      clientId: record.id,
      clientName: record.name,
      rootFolderId: driveFolders.root.id,
      rootFolderUrl: driveFolders.root.url,
    });

    updatedRecord = await updateClientRow(
      record.id,
      {
        drive_folder_id: driveFolders.root.id,
        drive_folder_url: driveFolders.root.url,
      },
      supabase
    );

    const persistedRecord = await getClientById(record.id, supabase);
    if (persistedRecord) {
      updatedRecord = persistedRecord;
    }

    console.info('[clients-service] Supabase Drive metadata persistence succeeded', {
      clientId: record.id,
      driveFolderId: updatedRecord.drive_folder_id,
      driveFolderUrl: updatedRecord.drive_folder_url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to provision Drive folders';
    console.error('[clients-service] Drive folder provisioning failed', {
      clientId: record.id,
      clientName: record.name,
      error: message,
    });
  }

  const assetSummaries = await listAssetSummaries(supabase);
  const mapped = mapClient(updatedRecord, assetSummaries);

  if (!mapped) {
    throw new Error('Failed to map client');
  }

  return mapped;
}

export async function updateClient(
  clientId: string,
  input: Partial<ClientInput>
): Promise<Client> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.slug !== undefined) updates.slug = normalizeSlug(input.slug);
  if (input.instagramHandle !== undefined) updates.instagram_handle = input.instagramHandle;
  if (input.brandColor !== undefined) updates.brand_color = input.brandColor;
  if (input.monthlyReelsTarget !== undefined) {
    updates.monthly_reels_target = input.monthlyReelsTarget;
  }
  if (input.monthlyPostsTarget !== undefined) {
    updates.monthly_posts_target = input.monthlyPostsTarget;
  }
  if (input.weeklyGoal !== undefined) updates.weekly_goal = input.weeklyGoal;
  if (input.weeklyPosterGoal !== undefined) updates.weekly_poster_goal = input.weeklyPosterGoal;
  if (input.weeklyReelGoal !== undefined) updates.weekly_reel_goal = input.weeklyReelGoal;
  if (input.contractStartDate !== undefined) updates.contract_start_date = input.contractStartDate;
  if (input.contractEndDate !== undefined) updates.contract_end_date = input.contractEndDate;

  if (input.monthlyReelsTarget !== undefined || input.monthlyPostsTarget !== undefined || input.monthlyGoal !== undefined) {
    const currentClient = await getClientById(clientId);
    if (currentClient) {
      const mReels = input.monthlyReelsTarget !== undefined ? input.monthlyReelsTarget : (currentClient.monthly_reels_target ?? 0);
      const mPosts = input.monthlyPostsTarget !== undefined ? input.monthlyPostsTarget : (currentClient.monthly_posts_target ?? 0);
      updates.monthly_goal = input.monthlyGoal !== undefined ? input.monthlyGoal : (mReels + mPosts);
    }
  }

  if (input.weeklyPosterGoal !== undefined || input.weeklyReelGoal !== undefined) {
    const currentClient = await getClientById(clientId);
    if (currentClient) {
      const pGoal = input.weeklyPosterGoal !== undefined ? input.weeklyPosterGoal : (currentClient.weekly_poster_goal ?? 0);
      const rGoal = input.weeklyReelGoal !== undefined ? input.weeklyReelGoal : (currentClient.weekly_reel_goal ?? 0);
      updates.weekly_goal = pGoal + rGoal;
    }
  }

  const record = await updateClientRow(
    clientId,
    updates as Parameters<typeof updateClientRow>[1]
  );
  const assetSummaries = await listAssetSummaries();
  const mapped = mapClient(record, assetSummaries);

  if (!mapped) {
    throw new Error('Failed to map client');
  }

  return mapped;
}

export async function removeClient(clientId: string): Promise<void> {
  const assets = await listAssetsByClientId(clientId);
  if (assets && assets.length > 0) {
    throw new Error('Cannot delete client because it has linked assets.');
  }
  await deleteClientRow(clientId);
}
