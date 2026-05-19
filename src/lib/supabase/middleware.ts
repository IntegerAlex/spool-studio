import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/database';

const protectedPrefixes = ['/dashboard'];

function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}

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

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedPath(request.nextUrl.pathname) && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
