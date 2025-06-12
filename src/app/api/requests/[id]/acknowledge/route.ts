// src/app/api/requests/[id]/acknowledge/route.ts
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
  // 1) تحقق من التوكن ودور "جهة مستفيدة"
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
  if (payload.role !== 'جهة مستفيدة') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2) استخراج معرف الطلب
  const { id: idStr } = await params;
  const requestId = parseInt(idStr, 10);
  if (isNaN(requestId)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  // 3) قراءة التعليق (رأي الجهة المستفيدة)
  const { comment } = await req.json();
  if (!comment || !comment.trim()) {
    return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
  }

  const db = await getConnection();

  // 4) تحديث حالة الطلب إلى "مكتمل"
  await db.request()
    .input('rid', sql.Int, requestId)
    .query(`
      UPDATE dbo.Requests
         SET Status = N'مكتمل'
       WHERE RequestID = @rid;
    `);

  // 5) إضافة السجل إلى RequestHistory
  await db.request()
    .input('rid',        sql.Int,           requestId)
    .input('actionBy',   sql.NVarChar(255), payload.name || payload.FullName)
    .input('actionType', sql.NVarChar(50),  'تأييد إنجاز')
    .input('actionNote', sql.NVarChar(500), comment.trim())
    .query(`
      INSERT INTO dbo.RequestHistory
        (RequestID, ActionBy, ActionType, ActionNote)
      VALUES
        (@rid, @actionBy, @actionType, @actionNote);
    `);

  return NextResponse.json({ success: true });
}
