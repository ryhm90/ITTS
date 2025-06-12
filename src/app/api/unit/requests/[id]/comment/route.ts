// src/app/api/division/requests/[id]/comment/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // 1) مصادقة وتفويض "مسؤول وحدة"
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
  if (payload.role !== 'مسؤول وحدة') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2) استخراج requestId من مسار الـ URL
  const segments = request.nextUrl.pathname.split('/');
  const rawId = segments[segments.length - 2]; // قبل "comment"
  const requestId = parseInt(rawId, 10);
  if (isNaN(requestId)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  // 3) قراءة التعليق من body
  let body: { comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const comment = body.comment?.trim();
  if (!comment) {
    return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
  }

  // 4) حفظ التعليق في سجل الطلبات
  const db = await getConnection();
  const actor = `${payload.role} - ${payload.unit?.name || ''} - ${payload.fullName || payload.name}`;

  try {
    await db
      .request()
      .input('rid',        sql.Int,           requestId)
      .input('actionBy',   sql.NVarChar(255), actor)
      .input('actionType', sql.NVarChar(50),  'تعليق')
      .input('actionNote', sql.NVarChar(500), comment)
      .query(`
        INSERT INTO dbo.RequestHistory
          (RequestID, ActionBy, ActionType, ActionNote)
        VALUES
          (@rid, @actionBy, @actionType, @actionNote);
      `);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Database error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
