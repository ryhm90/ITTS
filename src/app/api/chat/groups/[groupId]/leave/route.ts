// src/app/api/chat/group/[groupId]/leave/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
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
  const userId = payload.id;

  // 2) استخراج groupId من نهاية URL
  const url = new URL(request.url);
  const parts = url.pathname.split('/');
  const groupId = parseInt(parts[parts.length - 1], 10);
  if (isNaN(groupId)) {
    return NextResponse.json({ error: 'Invalid groupId' }, { status: 400 });
  }

  try {
    const db = await getConnection();
    await db.request()
      .input('gId', sql.Int, groupId)
      .input('uId', sql.Int, userId)
      .query(`
        DELETE FROM GroupMembers
        WHERE GroupID = @gId AND UserID = @uId;
      `);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Database error:', e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
