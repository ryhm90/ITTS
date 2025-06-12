// src/app/api/admin/requests/[id]/review/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export async function POST(
 req: NextRequest,
  context: any 
) {
  try {
    // 1) مصادقة
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

    // 2) تفويض دور "مدير قسم" فقط
    if (payload.role !== 'مدير قسم') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3) استخراج معرّف الطلب
    const requestId = parseInt(context.params.id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    // 4) قراءة نصّ المراجعة من body
    const { comment } = await req.json();
    if (!comment || !comment.trim()) {
      return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
    }

    const db = await getConnection();
    // 5) تحديث حالة الطلب إلى "معلق"
    await db.request()
      .input('rid', sql.Int, requestId)
      .input('status', sql.NVarChar(50), 'معلق')
      .query(`
        UPDATE dbo.Requests
        SET Status = @status
        WHERE RequestID = @rid;
      `);

    // 6) إضافة سجلّ المراجعة في سجلّ العمليات
    const actor = `${payload.role} - ${payload.department.name} - ${payload.fullName || payload.name}`;
    await db.request()
      .input('rid',        sql.Int,           requestId)
      .input('actionBy',   sql.NVarChar(200), actor)
      .input('actionType', sql.NVarChar(200), 'مراجعة الطلب')
      .input('actionNote', sql.NVarChar(sql.MAX), comment.trim())
      .query(`
        INSERT INTO dbo.RequestHistory
          (RequestID, ActionBy, ActionType, ActionNote)
        VALUES
          (@rid, @actionBy, @actionType, @actionNote);
      `);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in review route:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
