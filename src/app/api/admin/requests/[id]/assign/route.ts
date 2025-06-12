// src/app/api/admin/requests/[id]/assign/route.ts
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
  // 1) مصادقة JWT والتأكد من دور "مدير قسم"
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

  // 2) قراءة body للحصول على EmployeeId
  const { employeeId } = await req.json();
  const requestId = parseInt(context.params.id, 10);
  if (!employeeId) {
    return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
  }

  const db = await getConnection();

  // 3) التحقق من وجود الموظف وصلاحيته (اختياري)
  const empRes = await db
    .request()
    .input('empId', sql.Int, employeeId)
    .query(`
      SELECT FullName, Role
        FROM dbo.Users
       WHERE UserID = @empId
    `);
  if (empRes.recordset.length === 0) {
    return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 400 });
  }
  const { FullName: employeeName, Role: employeeRole } = empRes.recordset[0];

  // 4) تحديث الطلب: تعيين الموظف كمعالج حالي
  await db
    .request()
    .input('reqId',        sql.Int,          requestId)
    .input('empId',        sql.Int,          employeeId)
    .input('empName',      sql.NVarChar(255), employeeName)
    .input('currentRole',  sql.NVarChar(50),  employeeRole)
    .query(`
      UPDATE dbo.Requests
         SET
           AssignedToId       = @empId,
           AssignedToName     = @empName,
           CurrentHandlerRole = @currentRole,
           Status             = N'قيد الإنجاز'
       WHERE RequestID = @reqId
    `);

  return NextResponse.json({ success: true });
}
