import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/settings', '/admin'];
const publicOnlyRoutes = ['/login', '/register', '/reset-password'];

export function proxy(request: NextRequest) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isPublicOnlyRoute = publicOnlyRoutes.some((route) => pathname.startsWith(route));

  // Redirect to login if accessing a protected route without a session
  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to home if accessing login/register with an active session
  if (isPublicOnlyRoute && session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
