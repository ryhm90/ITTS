import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';

const PUBLIC_PATHS = ['/', '/login', '/api/auth/login'];

interface CustomJwtPayload {
  id: number;
  name: string;
  username: string;
  role: string;
  division?: string | null;
  iat: number;
  exp: number;
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (isPublic && token) {
    try {
      const payload = jwtDecode<CustomJwtPayload>(token);

      if (payload.role === 'مدير قسم') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else if (payload.role === 'مدير شعبة') {
        return NextResponse.redirect(new URL('/division/dashboard', request.url));
            } else if (payload.role === 'مسؤول وحدة') {
        return NextResponse.redirect(new URL('/unit/dashboard', request.url));

      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch {
      return NextResponse.next();
    }
  }

  if (!isPublic && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if ((pathname === '/dashboard') && token) {
    try {
      const payload = jwtDecode<CustomJwtPayload>(token);

      if (payload.role === 'مدير قسم') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else if (payload.role === 'مدير شعبة') {
        return NextResponse.redirect(new URL('/division/dashboard', request.url));
      } else if (payload.role === 'مسؤول وحدة') {
        return NextResponse.redirect(new URL('/unit/dashboard', request.url));

      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/request/:path*',
    '/admin/:path*',
    '/unit/:path*',
    '/division/:path*',
    '/', 
    '/login', 
    '/signup',
    '/chat/:path*',
    '/dashboard'
  ],
};
