import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('Missing SUPABASE_URL');
  }
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error('Missing SUPABASE_ANON_KEY');
  }
  return key;
}

export async function createServerSupabaseClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
  const mutableCookieStore = cookieStore as {
    set?: (args: { name: string; value: string } & Record<string, unknown>) => void;
  };

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        mutableCookieStore.set?.({ name, value, ...options });
      },
      remove(name, options) {
        mutableCookieStore.set?.({ name, value: '', ...options });
      },
    },
  });
}
