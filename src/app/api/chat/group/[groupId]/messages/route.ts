// src/app/api/chat/group/[groupId]/messages/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';

export async function GET(request: NextRequest) {
  // 1) Authentication
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 2) استخراج groupId من المسار
  const url = new URL(request.url);
  const segments = url.pathname.split('/');  
  // المسار يكون مثلاً "/api/chat/group/123/messages" => العنصر قبل الأخير هو المعرف
  const raw = segments[segments.length - 2];
  const groupId = parseInt(raw, 10);
  if (isNaN(groupId)) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }

  // 3) جلب الرسائل
  try {
    const db = await getConnection();
    const result = await db
      .request()
      .input('gId', sql.Int, groupId)
      .query(`
        SELECT *
        FROM Messages
        WHERE GroupID = @gId
        ORDER BY SentAt ASC
      `);

    return NextResponse.json({ messages: result.recordset });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
