// src/app/api/admin/requests/[id]/forward/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1) التحقق من وجود التوكن
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    // 2) التحقق من صحة التوكن
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 3) التحقق من الصلاحية
    if (payload.role !== 'admin' && payload.role !== 'مدير قسم') {
      return NextResponse.json({ error: 'Unauthorized - Insufficient role' }, { status: 403 });
    }

    // 4) استخراج رقم الطلب من المسار
    const parts = req.nextUrl.pathname.split('/');
    const requestId = Number(parts[parts.length - 2]);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    // 5) قراءة بيانات التحويل من الجسم
    const { division, divisionID, note } = await req.json();
    if (!division || !divisionID) {
      return NextResponse.json({ error: 'Division and divisionID are required' }, { status: 400 });
    }

    // 6) افتح الاتصال
    const pool = await getConnection();
    const actor = `${payload.role} - ${payload.department.name} - ${payload.fullName || payload.name}`;

    // 7) حدِّث جدول Requests
    await pool.request()
      .input('requestId', sql.Int, requestId)
      .input('roleId',    sql.Int, divisionID)
      .input('roleName',  sql.NVarChar(255), division)
      .input('notes',     sql.NVarChar(sql.MAX), note || '')
      .query(`
        UPDATE dbo.Requests
        SET 
          CurrentHandlerRole   = @roleName,
          CurrentHandlerRoleID = @roleId,
          Notes                = @notes,
          Status               = N'تم التوجيه'
        WHERE RequestID = @requestId
      `);

    // 8) أدخل سجل التحويل في CurrentHandlerRoleDivision
    await pool.request()
      .input('requestId', sql.Int, requestId)
      .input('roleId',    sql.Int, divisionID)
      .input('roleName',  sql.NVarChar(255), division)
      .input('notes',     sql.NVarChar(sql.MAX), note || '')
      .query(`
        INSERT INTO dbo.CurrentHandlerRoleDivision
          (RequestID, CurrentHandlerRoleID, CurrentHandlerRole, Notes)
        VALUES
          (@requestId, @roleId, @roleName, @notes)
      `);

    // 9) إدراج سجلّ في RequestHistory
    await pool.request()
      .input('requestId', sql.Int, requestId)
      .input('actionBy',  sql.NVarChar(200), actor)
      .input('actionType',sql.NVarChar(200), `تحويل إلى ${division}`)
      .input('actionNote',sql.NVarChar(sql.MAX), note || '')
      .query(`
        INSERT INTO dbo.RequestHistory
          (RequestID, ActionBy, ActionType, ActionNote)
        VALUES
          (@requestId, @actionBy, @actionType, @actionNote)
      `);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in forward route:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
