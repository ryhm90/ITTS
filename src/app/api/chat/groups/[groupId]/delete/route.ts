// src/app/api/chat/group/[groupId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';
import sql from 'mssql';

export const runtime = 'nodejs';

export async function DELETE(request: NextRequest) {
  // 1) مصادقة المستخدم
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

  // 2) استخراج groupId من مسار الـ URL
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const groupId = segments[segments.length - 1];
  if (!groupId) {
    return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
  }

  const userId = payload.id;

  try {
    const db = await getConnection();
    // 3) تحقق أنّ المستخدم مشرف
    const checkRes = await db.request()
      .input('gId', sql.Int, parseInt(groupId, 10))
      .input('uId', sql.Int, userId)
      .query(`
        SELECT 1 FROM GroupMembers
        WHERE GroupID = @gId AND UserID = @uId AND IsAdmin = 1
      `);
    if (checkRes.recordset.length === 0) {
      return NextResponse.json({ error: 'Forbidden: not an admin' }, { status: 403 });
    }

    // 4) احذف البيانات
    await db.request().input('gId', sql.Int, parseInt(groupId, 10)).query(`
      DELETE FROM GroupMembers WHERE GroupID = @gId;
      DELETE FROM Messages      WHERE GroupID = @gId;
      DELETE FROM ChatGroups     WHERE GroupID = @gId;
    `);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Database error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
