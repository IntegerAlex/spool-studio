import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/database';

const DEBUG_MIDDLEWARE = process.env.DEBUG_MIDDLEWARE === 'true';

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

function shouldLogMiddleware(pathname: string): boolean {
  return DEBUG_MIDDLEWARE || /^\/api\/assets\/[^/]+\/upload\/?$/.test(pathname);
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  if (shouldLogMiddleware(pathname)) {
    console.info('[middleware][forwarded-request]', {
      pathname,
      method: request.method,
      contentType: request.headers.get('content-type'),
      headerNames: Array.from(request.headers.keys()),
    });
  }

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

  let user = null;

  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    console.error('[middleware][session-error]', {
      pathname,
      method: request.method,
      error,
    });
    throw error;
  }

  if (isProtectedPath(pathname) && !user) {
    console.warn('[auth][middleware][redirect]', {
      pathname,
      method: request.method,
      redirectedFrom: pathname,
    });

    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
