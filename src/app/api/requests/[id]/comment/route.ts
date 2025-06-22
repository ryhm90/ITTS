// src/app/api/requests/[id]/comment/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';

function extractId(pathname: string): number | null {
  const m = pathname.match(/\/api\/requests\/(\d+)\/comment$/);
  return m ? parseInt(m[1], 10) : null;
}

export async function POST(request: NextRequest) {
  // 1) مصادقة المستخدم
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 2) استخراج requestId من المسار
  const requestId = extractId(request.nextUrl.pathname);
  if (requestId === null) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  // 3) قراءه التعليق من body والتحقق
  let body: { comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const comment = (body.comment || '').trim();
  if (!comment) {
    return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
  }

  try {
    const db = await getConnection();

    // 4) التحقق من أن الحالة الحالية للطلب هي "معلق"
    const statusRes = await db.request()
      .input('rid', sql.Int, requestId)
      .query<{ Status: string }>(`
        SELECT Status
        FROM dbo.Requests
        WHERE RequestID = @rid
      `);
    if (statusRes.recordset.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    if (statusRes.recordset[0].Status !== 'معلق') {
      return NextResponse.json(
        { error: 'Cannot comment unless status is "معلق"' },
        { status: 400 }
      );
    }

    // 5) تغيير حالة الطلب إلى "تمت الإجابة"
    await db.request()
      .input('rid', sql.Int, requestId)
      .query(`
        UPDATE dbo.Requests
        SET Status = N'تم التوجيه'
        WHERE RequestID = @rid;
      `);

    // 6) إضافة السجل في RequestHistory
    const actor = `${payload.role} - ${payload.department?.name} - ${payload.fullName || payload.name}`;
    await db.request()
      .input('rid',        sql.Int,           requestId)
      .input('actionBy',   sql.NVarChar(255), actor)
      .input('actionType', sql.NVarChar(50),  'إجابة')
      .input('actionNote', sql.NVarChar(sql.MAX), comment)
      .query(`
        INSERT INTO dbo.RequestHistory
          (RequestID, ActionBy, ActionType, ActionNote)
        VALUES
          (@rid, @actionBy, @actionType, @actionNote);
      `);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in comment route:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
