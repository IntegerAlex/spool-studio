import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ClientReference, ClientReferenceType } from '@/types/index';
import type { Database } from '@/types/database';
import {
  deleteClientReference as deleteClientReferenceRow,
  getClientReferenceById,
  insertClientReference,
  listClientReferencesByClientId,
  updateClientReference as updateClientReferenceRow,
} from '@/repositories/client-references-repository';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';
import { sendReferenceNotification } from '@/lib/notifications/mailgun';
import { listAssetsByClientId } from '@/repositories/assets-repository';
import { getUserById } from '@/repositories/users-repository';
import { getClientById } from '@/repositories/clients-repository';
import { getCurrentUser } from '@/lib/auth';

const allowedProtocols = new Set(['http:', 'https:']);

export interface ClientReferenceInput {
  clientId: string;
  title: string;
  url: string;
  description?: string | null;
  type?: ClientReferenceType;
}

function normalizeText(value: string): string {
  return value.trim();
}

function normalizeDescription(value?: string | null): string | null {
  if (value == null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function validateReferenceUrl(url: string): string {
  const normalized = normalizeText(url);
  if (!normalized) {
    throw new Error('URL is required');
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('URL is invalid');
  }

  if (!allowedProtocols.has(parsed.protocol)) {
    throw new Error('Only http and https URLs are allowed');
  }

  return parsed.toString();
}

function mapReference(
  reference: Awaited<ReturnType<typeof getClientReferenceById>>
): ClientReference | null {
  if (!reference) {
    return null;
  }

  return {
    id: reference.id,
    clientId: reference.client_id,
    title: reference.title,
    url: reference.url,
    description: reference.description,
    type: reference.type,
    createdAt: new Date(reference.created_at),
    updatedAt: new Date(reference.updated_at),
  };
}

export async function getClientReferences(clientId: string): Promise<ClientReference[]> {
  try {
    const rows = await listClientReferencesByClientId(clientId);
    return rows.map((reference) => ({
      id: reference.id,
      clientId: reference.client_id,
      title: reference.title,
      url: reference.url,
      description: reference.description,
      type: reference.type,
      createdAt: new Date(reference.created_at),
      updatedAt: new Date(reference.updated_at),
    }));
  } catch (error) {
    logProductionRuntimeError('client-references-loader', error, { clientId });
    return [];
  }
}

export async function createClientReference(input: ClientReferenceInput): Promise<ClientReference> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const supabase = await createServerSupabaseClient();

  const title = normalizeText(input.title);
  if (!title) {
    throw new Error('Title is required');
  }

  const url = validateReferenceUrl(input.url);

  const record = await insertClientReference({
    client_id: input.clientId,
    title,
    url,
    description: normalizeDescription(input.description),
    type: input.type ?? 'other',
  }, supabase);

  const mapped = mapReference(record);
  if (!mapped) {
    throw new Error('Failed to map client reference');
  }

  // Handle Notifications async (do not block reference creation)
  (async () => {
    try {
      const client = await getClientById(input.clientId, supabase);
      const clientName = client?.name || 'Unknown Client';
      const assets = await listAssetsByClientId(input.clientId, supabase);
      
      const assignedIds = new Set<string>();
      for (const asset of assets) {
        if (asset.assigned_to) {
          assignedIds.add(asset.assigned_to);
        }
      }

      for (const designerId of assignedIds) {
        if (designerId === user.id) continue; // Don't notify the person who added it

        const designer = await getUserById(designerId, supabase);
        if (designer?.email) {
          void sendReferenceNotification({
            clientId: input.clientId,
            clientName,
            referenceId: mapped.id,
            referenceTitle: mapped.title,
            referenceType: mapped.type,
            referenceDescription: mapped.description,
            referenceUrl: mapped.url,
            addedBy: {
              email: user.email,
              name: user.name || null,
            },
            timestamp: mapped.createdAt,
            designerEmail: designer.email,
            designerId: designer.id,
          });
        }
      }
    } catch (err) {
      console.error('[client-references-service] Failed to send reference notifications', err);
    }
  })();

  return mapped;
}

export async function updateClientReference(
  referenceId: string,
  input: Partial<Omit<ClientReferenceInput, 'clientId'>>
): Promise<ClientReference> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const supabase = await createServerSupabaseClient();

  const updates: Database['public']['Tables']['client_references']['Update'] = {};

  if (input.title !== undefined) {
    const title = normalizeText(input.title);
    if (!title) {
      throw new Error('Title is required');
    }
    updates.title = title;
  }

  if (input.url !== undefined) {
    updates.url = validateReferenceUrl(input.url);
  }

  if (input.description !== undefined) {
    updates.description = normalizeDescription(input.description);
  }

  if (input.type !== undefined) {
    updates.type = input.type;
  }

  const record = await updateClientReferenceRow(referenceId, updates, supabase);
  const mapped = mapReference(record);
  if (!mapped) {
    throw new Error('Failed to map client reference');
  }

  return mapped;
}

export async function removeClientReference(referenceId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const supabase = await createServerSupabaseClient();
  await deleteClientReferenceRow(referenceId, supabase);
}