// src/app/api/admin/requests/[id]/complete/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export async function POST(
 req: NextRequest, context: any
) {
  // 1) مصادقة وتفويض
  const token = req.cookies.get('token')?.value;
  if (!token)
    return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  let payload: any;
  try { payload = jwt.verify(token, process.env.JWT_SECRET!); }
  catch { return NextResponse.json({ error:'Invalid token' }, { status:401 }); }
  if (payload.role == 'جهة مستفيدة' )
    return NextResponse.json({ error:'Forbidden' }, { status:403 });

  // 2) قراءة معرّف الطلب
        const awaitedParams = await context.params;
    const idParam = awaitedParams.id;              // مثال: "76"
    const requestId = Number(idParam);

  if (isNaN(requestId))
    return NextResponse.json({ error:'Invalid request ID' }, { status:400 });

  const pool = await getConnection();
    const actor = `${payload.role} - ${payload.department.name} - ${payload.fullName || payload.name}`;

  // 3) تحديث الحالة
  await pool.request()
    .input('rid', sql.Int, requestId)
    .query(`UPDATE dbo.Requests SET Status = N'تم الإنجاز' WHERE RequestID = @rid;`);

  // 4) تسجيل في السجلّ
  await pool.request()
    .input('rid',        sql.Int,           requestId)
    .input('actionBy',   sql.NVarChar(200), actor)
    .input('actionType', sql.NVarChar(100), 'تأكيد الإنجاز')
    .input('actionNote', sql.NVarChar(sql.MAX), '')
    .query(`
      INSERT INTO dbo.RequestHistory
        (RequestID, ActionBy, ActionType, ActionNote)
      VALUES
        (@rid, @actionBy, @actionType, @actionNote);
    `);

  return NextResponse.json({ success: true });
}
