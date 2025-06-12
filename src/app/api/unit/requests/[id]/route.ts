// src/app/api/division/requests/[id]/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }    // params هنا يصبح Promise
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

  // 2) استخراج معرّف الطلب (لا تنس await)
  const { id: requestIdStr } = await params;
  const requestId = parseInt(requestIdStr, 10);
  if (isNaN(requestId)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  // 3) جلب تفاصيل الطلب مع بيانات الجهاز والهيكل الهرمي
  const db = await getConnection();
  const ps = db.request().input('id', sql.Int, requestId);

  const { recordset } = await ps.query(`
    SELECT
      r.RequestID        AS RequestID,
      r.Title            AS Title,
      r.Description      AS Description,
      r.Status           AS Status,
      r.service,
      r.memoID,
      ImageUrls,
      r.memoDate,
      r.RequestDate      AS RequestDate,
      r.DivisionName     AS divisionName,
      r.DepartmentName   AS departmentName,
      r.SectionName      AS sectionName,
      r.SectionID        AS sectionId,
      d.id_dvises        AS deviceId,
      t.dv_type          AS deviceType,
      d.no_dv            AS deviceNo,
      desc2.description_dv AS deviceDesc
    FROM dbo.Requests r
    JOIN dbo.T_dvises d
      ON r.DeviceId = d.id_dvises
    JOIN dbo.T_devc_type t
      ON d.type_dv = t.id_d_t
    LEFT JOIN dbo.T_description_dv desc2
      ON d.description_dv2 = desc2.id_descript
    WHERE r.RequestID = @id
  `);

  return NextResponse.json(recordset[0] || null);
}
