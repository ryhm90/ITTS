export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1) مصادقة وتفويض فقط "مدير قسم"
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  if (payload.role !== 'مدير قسم') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2) استخراج معرّف الطلب بانتظار حلّ الـ params
  const { id: requestIdStr } = await params;
  const requestId = parseInt(requestIdStr, 10);
  if (isNaN(requestId)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  // 3) قراءة التعليق من الـ body
  const { comment } = await req.json();
  if (!comment || !comment.trim()) {
    return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
  }

    const actor = `${payload.role} - ${payload.department.name} - ${payload.fullName || payload.name}`;

  // 5) إضافة السجل
  const db = await getConnection();
  await db.request()
    .input('rid',        sql.Int,           requestId)
    .input('actionBy',   sql.NVarChar(255), actor)
    .input('actionType', sql.NVarChar(50),  'تعليق')
    .input('actionNote', sql.NVarChar(500), comment.trim())
    .query(`
      INSERT INTO dbo.RequestHistory
        (RequestID, ActionBy, ActionType, ActionNote)
      VALUES
        (@rid, @actionBy, @actionType, @actionNote);
    `);

  return NextResponse.json({ success: true });
}


