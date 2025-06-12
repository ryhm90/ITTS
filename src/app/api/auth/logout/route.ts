import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // ✅ نوجه إلى /login باستخدام URL كامل
  const response = NextResponse.redirect(new URL('/login', req.url));
  
  // ✅ نحذف الكوكي token
  response.cookies.set('token', '', { maxAge: 0 });

  return response;
}
