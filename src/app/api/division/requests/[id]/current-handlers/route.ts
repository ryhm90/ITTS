// src/app/api/division/requests/[id]/current-handlers/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

  // 2) استخراج requestId من المسار
  const match = request.nextUrl.pathname.match(
    /\/api\/division\/requests\/(\d+)\/current-handlers$/
  );
  const requestId = match?.[1] ? parseInt(match[1], 10) : NaN;
  if (isNaN(requestId)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  // 3) جلب الموظفين المعينين من القاعدة
  const db = await getConnection();
  const ps = db.request().input('reqId', sql.Int, requestId);

  try {
    const { recordset } = await ps.query(`
      SELECT EmpID, EmpName
      FROM dbo.CurrentHandlerRoleUnit
      WHERE RequestID = @reqId
    `);
    const handlers = recordset.map((row: any) => ({
      EmpID: row.EmpID,
      EmpName: row.EmpName,
    }));
    return NextResponse.json(handlers);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
