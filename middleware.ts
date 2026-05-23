import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const DEBUG_MIDDLEWARE = process.env.DEBUG_MIDDLEWARE === 'true';

function isAssetUploadRoute(pathname: string): boolean {
  return /^\/api\/assets\/[^/]+\/upload\/?$/.test(pathname);
}

function shouldLogMiddleware(pathname: string): boolean {
  return DEBUG_MIDDLEWARE || isAssetUploadRoute(pathname);
}

export async function middleware(request: NextRequest) {
  const contentType = request.headers.get('content-type');
  const pathname = request.nextUrl.pathname;

  if (shouldLogMiddleware(pathname)) {
    if (isAssetUploadRoute(pathname)) {
      console.info('[upload][content-type]', {
        pathname,
        method: request.method,
        contentType,
      });

      if (!/^multipart\/form-data\b/i.test(contentType ?? '')) {
        console.warn('[upload][unexpected-content-type]', {
          pathname,
          method: request.method,
          contentType,
        });
      }

      console.info('[middleware][upload-bypass]', {
        pathname,
        contentType,
        action: 'preserve-original-request',
      });
    } else if (DEBUG_MIDDLEWARE) {
      console.info('[middleware][debug]', {
        pathname,
        method: request.method,
        contentType,
      });
    }

    return updateSession(request);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
