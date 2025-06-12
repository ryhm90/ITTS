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
  // 1) مصادقة وتفويض "مدير شعبة"
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
  if (payload.role !== 'مسؤول وحدة') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2) استخراج معرّف الطلب
  const { id: requestIdStr } = await params;
  const requestId = parseInt(requestIdStr, 10);
  if (isNaN(requestId)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  const db = await getConnection();
    const actor = `${payload.role} - ${payload.section.name} - ${payload.fullName || payload.name}`;

  // 3) تحديث حالة الطلب إلى "تم الإنجاز"
  await db
    .request()
    .input('rid', sql.Int, requestId)
    .query(`
      UPDATE dbo.Requests
        SET Status = N'تم الإنجاز'
      WHERE RequestID = @rid;
    `);

  // 4) إضافة سجل في RequestHistory
  await db
    .request()
    .input('rid',        sql.Int,           requestId)
    .input('actionBy',   sql.NVarChar(255), actor)
    .input('actionType', sql.NVarChar(50),  'تأكيد إنجاز')
    .input('actionNote', sql.NVarChar(500), '')
    .query(`
      INSERT INTO dbo.RequestHistory
        (RequestID, ActionBy, ActionType, ActionNote)
      VALUES
        (@rid, @actionBy, @actionType, @actionNote);
    `);

  return NextResponse.json({ success: true });
}
