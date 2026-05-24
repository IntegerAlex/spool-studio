import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const DEBUG_MIDDLEWARE = process.env.DEBUG_MIDDLEWARE === 'true';

function isAssetUploadRoute(pathname: string): boolean {
  return /^\/api\/assets\/[^/]+\/upload\/?$/.test(pathname);
}

function shouldLogMiddleware(pathname: string): boolean {
  return DEBUG_MIDDLEWARE || isAssetUploadRoute(pathname);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (shouldLogMiddleware(pathname) && DEBUG_MIDDLEWARE) {
    console.info('[middleware][debug]', {
      pathname,
      method: request.method,
      contentType: request.headers.get('content-type'),
    });
  }

  try {
    return updateSession(request);
  } catch (error) {
    console.error('[middleware][production-error]', {
      pathname,
      message: error instanceof Error ? error.message : 'unknown',
    });

    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/assets/[^/]+/upload(?:/|$)|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
