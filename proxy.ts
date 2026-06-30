import { NextResponse, type NextRequest } from 'next/server';
import { getUserFromRequest, SESSION_COOKIE_NAME } from '@/lib/auth';

const DEBUG_MIDDLEWARE = process.env.DEBUG_MIDDLEWARE === 'true';

function isAssetUploadRoute(pathname: string): boolean {
  return /^\/api\/assets\/[^/]+\/upload\/?$/.test(pathname);
}

function shouldLogMiddleware(pathname: string): boolean {
  return DEBUG_MIDDLEWARE || isAssetUploadRoute(pathname);
}

const protectedPrefixes = ['/dashboard'];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (shouldLogMiddleware(pathname) && DEBUG_MIDDLEWARE) {
    console.info('[proxy][debug]', { pathname, method: request.method });
  }

  try {
    const user = await getUserFromRequest(request.cookies);
    
    if (protectedPrefixes.some(p => pathname === p || pathname.startsWith(p + '/')) && !user) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  } catch (error) {
    console.error('[proxy][error]', { pathname, message: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/assets/[^/]+/upload(?:/|$)|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
