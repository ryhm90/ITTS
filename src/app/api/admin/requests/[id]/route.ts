// src/app/api/admin/requests/[id]/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1) Authenticate & authorize "مدير قسم"
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

  // 2) Extract & validate request ID
  const { id: idStr } = await params;
  const requestId = parseInt(idStr, 10);
  if (isNaN(requestId)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  // 3) Query with hierarchy + device info
  const db = await getConnection();
  const ps = db.request().input('reqId', sql.Int, requestId);

  const { recordset } = await ps.query(`
    SELECT
      r.RequestID         AS RequestID,
      r.Title             AS Title,
      r.Description       AS Description,
      r.Status            AS Status,
      r.service,
      r.memoID,
      ImageUrls,
      r.memoDate,
      r.RequestDate       AS RequestDate,
      -- الهيكل الهرمي
      r.DivisionName      AS divisionName,
      r.DepartmentName    AS departmentName,
      r.SectionName       AS sectionName,
      -- معلومات الجهاز
      d.id_dvises         AS deviceId,
      t.dv_type           AS deviceType,
      d.no_dv             AS deviceNo,
      desc2.description_dv AS deviceDesc
    FROM dbo.Requests AS r
    JOIN dbo.T_dvises AS d
      ON r.DeviceId = d.id_dvises
    JOIN dbo.T_devc_type AS t
      ON d.type_dv = t.id_d_t
    LEFT JOIN dbo.T_description_dv AS desc2
      ON d.description_dv2 = desc2.id_descript
    WHERE r.RequestID = @reqId
  `);
  return NextResponse.json(recordset[0] ?? null);
}
