import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'tn_session';

const PRIVATE_API_PREFIXES = [
  '/api/billing',
  '/api/affiliate',
  '/api/auth/me',
  '/api/account',
  '/api/wallet',
];

const isPrivateApi = (pathname: string) =>
  PRIVATE_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === '/niche-finder' || pathname.startsWith('/niche-finder/')) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = pathname.replace('/niche-finder', '/timsieungach');
    nextUrl.search = search;
    return NextResponse.redirect(nextUrl);
  }

  if (!hasSession && isPrivateApi(pathname)) {
    return NextResponse.json({ ok: false, message: 'Bạn cần đăng nhập.' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
