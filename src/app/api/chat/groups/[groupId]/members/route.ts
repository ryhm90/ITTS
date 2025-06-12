// src/app/api/chat/group/[groupId]/promote/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // 1) مصادقة الـ JWT
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 2) استخراج userId و action و memberId من body
  const { action, memberId } = await request.json();
  if (!['promote','demote','remove'].includes(action) || !memberId) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const userId = payload.id;

  // 3) استخراج groupId من URL
  //    URL هو مثلاً https://.../api/chat/group/123/promote
  const parts = new URL(request.url).pathname.split('/');
  const raw = parts[parts.indexOf('group') + 1];
  const groupId = Number(raw);
  if (isNaN(groupId)) {
    return NextResponse.json({ error: 'Invalid groupId' }, { status: 400 });
  }

  // 4) تأكد أن المُرسل مشرف على المجموعة
  const db = await getConnection();
  const adminCheck = await db.request()
    .input('gId', sql.Int, groupId)
    .input('uId', sql.Int, userId)
    .query(`
      SELECT 1 FROM GroupMembers
      WHERE GroupID = @gId AND UserID = @uId AND IsAdmin = 1
    `);
  if (adminCheck.recordset.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 5) تنفيذ الإجراء المناسب
  if (action === 'promote') {
    await db.request()
      .input('gId', sql.Int, groupId)
      .input('mId', sql.Int, memberId)
      .query(`
        UPDATE GroupMembers
        SET IsAdmin = 1
        WHERE GroupID = @gId AND UserID = @mId;
      `);
  } else if (action === 'demote') {
    await db.request()
      .input('gId', sql.Int, groupId)
      .input('mId', sql.Int, memberId)
      .query(`
        UPDATE GroupMembers
        SET IsAdmin = 0
        WHERE GroupID = @gId AND UserID = @mId;
      `);
  } else {
    await db.request()
      .input('gId', sql.Int, groupId)
      .input('mId', sql.Int, memberId)
      .query(`
        DELETE FROM GroupMembers
        WHERE GroupID = @gId AND UserID = @mId;
      `);
  }

  return NextResponse.json({ success: true });
}
