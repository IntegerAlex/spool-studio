import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

let browserClient: SupabaseClient<Database> | null = null;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return key;
}

export function createBrowserSupabaseClient(): SupabaseClient<Database> {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
  }

  return browserClient;
}
