import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const db = await getConnection();

  const hashed = crypto.createHash('sha256').update(password).digest('hex');
  const result = await db.query`
    SELECT * FROM Users WHERE Username = ${username} AND PasswordHash = ${hashed}
  `;

  if (result.recordset.length === 0) {
    return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 });
  }

  const user = result.recordset[0];
  const token = jwt.sign({ id: user.UserID, role: user.Role }, process.env.JWT_SECRET!, { expiresIn: '1d' });

  const response = NextResponse.json({ success: true });

  // إرسال JWT في كوكي
  response.cookies.set({
    name: 'token',
    value: token,
    httpOnly: true,
    maxAge: 60 * 60 * 24,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' // ضروري للإنتاج
  });

  return response;
}
