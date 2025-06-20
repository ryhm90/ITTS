// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // مسح التوكن
  const res = NextResponse.json({ success: true });
  res.cookies.set('token', '', { maxAge: 0, path: '/' });
  return res;
}
