import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createServerSupabaseClient } from './server';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

export async function getSession() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      logProductionRuntimeError('supabase-get-session', error);
      return null;
    }
    return data.session;
  } catch (error) {
    logProductionRuntimeError('supabase-get-session', error);
    return null;
  }
}

export async function getUser(): Promise<User | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      logProductionRuntimeError('supabase-get-user', error);
      return null;
    }
    return data.user ?? null;
  } catch (error) {
    logProductionRuntimeError('supabase-get-user', error);
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}
