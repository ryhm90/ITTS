// src/app/api/admin/requests/[id]/decline/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
import jwt from 'jsonwebtoken';
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

export async function POST(
 req: NextRequest, context: any
) {
  // 1) مصادقة وتفويض
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
  // لا نسمح لـ جهة مستفيدة بالاعتذار
  if (payload.role === 'جهة مستفيدة') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2) نحصل على القيمة من params.id بدلاً من params.requestId
      const awaitedParams = await context.params;
    const idParam = awaitedParams.id;              // مثال: "76"
    const rid = Number(idParam);

  if (isNaN(rid)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  // 3) نفتح اتصالاً بقاعدة البيانات
  const pool = await getConnection();
  const actor = `${payload.role} - ${payload.department.name} - ${payload.fullName || payload.name}`;

  // 4) نحدّث حالة الطلب إلى "اعتذار"
  await pool.request()
    .input('rid', sql.Int, rid)
    .query(`
      UPDATE dbo.Requests
      SET Status = N'اعتذار'
      WHERE RequestID = @rid;
    `);

  // 5) نسجّل العملية في RequestHistory
  await pool.request()
    .input('rid', sql.Int, rid)
    .input('actionBy', sql.NVarChar(200), actor)
    .input('actionType', sql.NVarChar(100), 'اعتذار')
    .input('actionNote', sql.NVarChar(sql.MAX), '')
    .query(`
      INSERT INTO dbo.RequestHistory
        (RequestID, ActionBy, ActionType, ActionNote)
      VALUES
        (@rid, @actionBy, @actionType, @actionNote);
    `);

  return NextResponse.json({ success: true });
}
