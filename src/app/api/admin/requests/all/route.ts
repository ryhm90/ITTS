// src/app/api/admin/requests/route.ts
export const runtime = 'nodejs';

import jwt from 'jsonwebtoken';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
  }
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  if (payload.role !== 'مدير قسم') {
    return NextResponse.json({ error: 'Forbidden - Access Denied' }, { status: 403 });
  }
  const url = new URL(req.url);
  const page     = parseInt(url.searchParams.get('page')    || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize')|| '10',10);
  const offset   = (page - 1) * pageSize;

  const pool = await getConnection();

  // 1) إجمالي عدد الطلبات
  const totalResult = await pool.request()
    .query(`SELECT COUNT(*) AS total FROM dbo.Requests`);
  const total = totalResult.recordset[0].total;

  // 2) صفحة البيانات
  const dataResult = await pool.request()
    .input('offset',   sql.Int, offset)
    .input('pageSize', sql.Int, pageSize)
    .query(`
      SELECT
      r.RequestID         AS RequestID,
      r.Title             AS Title,
      r.Status            AS Status,
      r.RequestDate       AS RequestDate,
      r.DivisionName      AS divisionName,
 r.service,
      r.memoID,
      ImageUrls,
      r.memoDate,
      r.DepartmentName    AS departmentName,
      r.SectionName       AS sectionName,
      d.id_dvises         AS deviceId,
      t.dv_type           AS deviceType,
      d.no_dv             AS deviceNo,
      desc2.description_dv AS deviceDesc
    FROM dbo.Requests r
    JOIN dbo.T_dvises d
      ON r.DeviceId = d.id_dvises
    JOIN dbo.T_devc_type t
      ON d.type_dv = t.id_d_t
    LEFT JOIN dbo.T_description_dv desc2
      ON d.description_dv2 = desc2.id_descript
      ORDER BY r.RequestDate DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    `);

  return NextResponse.json({ 
    items: dataResult.recordset,
    total,
    page,
    pageSize
  });
}
