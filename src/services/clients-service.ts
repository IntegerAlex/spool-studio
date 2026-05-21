import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Client } from '@/types/index';
import {
  deleteClient as deleteClientRow,
  getClientById,
  insertClient,
  listClients,
  updateClient as updateClientRow,
} from '@/repositories/clients-repository';
import { listAssetSummaries } from '@/repositories/assets-repository';
import { createClientDriveFolders } from '@/integrations/google-drive/folder-service';

export interface ClientInput {
  name: string;
  slug: string;
  instagramHandle?: string;
  brandColor?: string;
  monthlyReelsTarget?: number;
  monthlyPostsTarget?: number;
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

function mapClient(
  client: Awaited<ReturnType<typeof getClientById>>,
  assetSummaries: Awaited<ReturnType<typeof listAssetSummaries>>
): Client | null {
  if (!client) {
    return null;
  }

  const monthlyDeliverables =
    (client.monthly_reels_target ?? 0) + (client.monthly_posts_target ?? 0);

  const now = new Date();
  const monthStart = getMonthStart(now);
  const clientAssets = assetSummaries.filter((asset) => asset.client_id === client.id);
  const completedDeliverables = clientAssets.filter((asset) => {
    if (asset.status !== 'uploaded' || !asset.created_at) {
      return false;
    }
    return new Date(asset.created_at) >= monthStart;
  }).length;

  const assignedTeamMembers = Array.from(
    new Set(
      clientAssets
        .map((asset) => asset.assigned_to)
        .filter((value): value is string => Boolean(value))
    )
  );

  return {
    id: client.id,
    name: client.name,
    slug: client.slug,
    instagramHandle: normalizeInstagramHandle(client.instagram_handle),
    monthlyDeliverables,
    completedDeliverables,
    assignedTeamMembers,
    brandColor: client.brand_color ?? undefined,
    driveFolderId: client.drive_folder_id ?? undefined,
    driveFolderUrl: client.drive_folder_url ?? undefined,
  };
}

export async function getClients(): Promise<Client[]> {
  const [clients, assetSummaries] = await Promise.all([
    listClients(),
    listAssetSummaries(),
  ]);

  return clients
    .map((client) => mapClient(client, assetSummaries))
    .filter((client): client is Client => Boolean(client));
}

export async function getClientDetail(clientId: string): Promise<Client | null> {
  const [client, assetSummaries] = await Promise.all([
    getClientById(clientId),
    listAssetSummaries(),
  ]);

  return mapClient(client, assetSummaries);
}

export async function createClient(input: ClientInput): Promise<Client> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  const record = await insertClient(
    {
      name: input.name,
      slug: normalizeSlug(input.slug),
      instagram_handle: input.instagramHandle ?? null,
      brand_color: input.brandColor ?? null,
      monthly_reels_target: input.monthlyReelsTarget ?? 0,
      monthly_posts_target: input.monthlyPostsTarget ?? 0,
      created_by: user.id,
    },
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
  await deleteClientRow(clientId);
}
