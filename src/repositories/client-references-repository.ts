import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type DbClientReference = Database['public']['Tables']['client_references']['Row'];

async function getClient(client?: SupabaseClient<Database>) {
  return client ?? (await createServerSupabaseClient());
}

export async function listClientReferencesByClientId(
  clientId: string,
  client?: SupabaseClient<Database>
): Promise<DbClientReference[]> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('client_references')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getClientReferenceById(
  referenceId: string,
  client?: SupabaseClient<Database>
): Promise<DbClientReference | null> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('client_references')
    .select('*')
    .eq('id', referenceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function insertClientReference(
  payload: Database['public']['Tables']['client_references']['Insert'],
  client?: SupabaseClient<Database>
): Promise<DbClientReference> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('client_references')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateClientReference(
  referenceId: string,
  updates: Database['public']['Tables']['client_references']['Update'],
  client?: SupabaseClient<Database>
): Promise<DbClientReference> {
  const supabase = await getClient(client);
  const { data, error } = await supabase
    .from('client_references')
    .update(updates)
    .eq('id', referenceId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteClientReference(
  referenceId: string,
  client?: SupabaseClient<Database>
): Promise<void> {
  const supabase = await getClient(client);
  const { error } = await supabase.from('client_references').delete().eq('id', referenceId);

  if (error) {
    throw new Error(error.message);
  }
}