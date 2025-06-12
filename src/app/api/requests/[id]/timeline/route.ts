// src/app/api/requests/[id]/timeline/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
import jwt from 'jsonwebtoken';
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // 1) المصادقة عبر التوكن في الهيدر
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 2) استخراج requestId من مسار الـ URL
  const parts = request.nextUrl.pathname.split('/');
  const rawId = parts[parts.length - 1];
  const requestId = parseInt(rawId, 10);
  if (isNaN(requestId)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  try {
    // 3) استعلام محمي بالمعاملات
    const db = await getConnection();
    const result = await db
      .request()
      .input('rid', sql.Int, requestId)
      .query(`
        SELECT
          ActionText,
          ActionType,
          ActionDate
        FROM dbo.RequestTimeline
        WHERE RequestID = @rid
        ORDER BY ActionDate ASC
      `);

    return NextResponse.json(result.recordset);
  } catch (err) {
    console.error('Database error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
