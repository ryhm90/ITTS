// src/app/api/admin/requests/[id]/handlers/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {

  // 1) مصادقة
  const token = request.cookies.get('token')?.value;
  if (!token)
    return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  let payload: any;
  try { payload = jwt.verify(token, process.env.JWT_SECRET!); }
  catch { return NextResponse.json({ error:'Invalid token' }, { status:401 }); }
  if (payload.role !== 'مدير قسم')
    return NextResponse.json({ error:'Forbidden' }, { status:403 });

  // 2) رقم الطلب
 // 2) استخراج requestId من المسار
  const url = new URL(request.url);
  const parts = url.pathname.split('/'); 
  // ["", "api", "admin", "requests", "{id}", "handlers"]
  const idStr = parts[4];
  const requestId = parseInt(idStr, 10);  if (isNaN(requestId))
    return NextResponse.json({ error:'Invalid request ID' }, { status:400 });

  // 3) جلب من CurrentHandlerRoleUnit
  const pool = await getConnection();
  const result = await pool.request()
    .input('rid', sql.Int, requestId)
    .query(`
      SELECT
        CurrentHandlerRoleID AS sectionId,
        CurrentHandlerRole   AS sectionName,
        -- EmpId و EmpName هي أسماء أعمدة حسب الـ route السابق
        Notes                AS note
      FROM CurrentHandlerRoleDivision
      WHERE RequestID = @rid
      ORDER BY ID;
    `);

  return NextResponse.json(result.recordset);
}
