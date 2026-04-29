import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const cookie = req.cookies.get('manager_auth');
  if (!cookie || cookie.value !== 'true') {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/manager', '/manager/:path*'],
};
