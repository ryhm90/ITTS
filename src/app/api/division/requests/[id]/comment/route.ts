// src/app/api/division/requests/[id]/comment/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // 1) مصادقة وتفويض "مدير شعبة"
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
  if (payload.role !== 'مدير شعبة') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2) استخراج requestId من مسار URL
  const match = request.nextUrl.pathname.match(
    /\/api\/division\/requests\/(\d+)\/comment$/
  );
  const requestId = match?.[1] ? parseInt(match[1], 10) : NaN;
  if (isNaN(requestId)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  // 3) قراءة التعليق من body
  const { comment } = await request.json();
  if (!comment || !comment.trim()) {
    return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
  }

  // 4) حفظ التعليق في سجل العمليات
  const db = await getConnection();
  const actor = `${payload.role} - ${payload.section?.name} - ${payload.fullName || payload.name}`;

  await db
    .request()
    .input('rid', sql.Int, requestId)
    .input('actionBy', sql.NVarChar(255), actor)
    .input('actionType', sql.NVarChar(50), 'تعليق')
    .input('actionNote', sql.NVarChar(500), comment.trim())
    .query(`
      INSERT INTO dbo.RequestHistory
        (RequestID, ActionBy, ActionType, ActionNote)
      VALUES
        (@rid, @actionBy, @actionType, @actionNote);
    `);

  return NextResponse.json({ success: true });
}
