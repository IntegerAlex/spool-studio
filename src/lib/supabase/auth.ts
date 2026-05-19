import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createServerSupabaseClient } from './server';

export async function getSession() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return null;
  }
  return data.session;
}

export async function getUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }
  return data.user ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}
