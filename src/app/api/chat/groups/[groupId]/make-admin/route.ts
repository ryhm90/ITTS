// src/app/api/chat/group/[groupId]/promote/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';
import sql from 'mssql';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // 1) مصادقة
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 2) استخراج userId من body
  let body: { userId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const userId = Number(body.userId);
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  // 3) استخراج groupId من نهاية URL
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const raw = segments.pop();           // "promote"
  const maybe = segments.pop();         // "[groupId]"
  const groupId = maybe ? parseInt(maybe, 10) : NaN;
  if (isNaN(groupId)) {
    return NextResponse.json({ error: 'Invalid groupId' }, { status: 400 });
  }

  // 4) تحديث IsAdmin
  try {
    const db = await getConnection();
    await db.request()
      .input('gId', sql.Int, groupId)
      .input('uId', sql.Int, userId)
      .query(`
        UPDATE GroupMembers
        SET IsAdmin = 1
        WHERE GroupID = @gId AND UserID = @uId;
      `);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Database error:', e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
