// src/app/api/admin/requests/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';
import sql from 'mssql';

export async function GET(req: NextRequest) {
  // (1) مصادقة وتفويض
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

  // (2) جلب الباراميترات
  const url      = new URL(req.url);
  const page     = parseInt(url.searchParams.get('page')     || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
  const offset   = (page - 1) * pageSize;
  const devIdStr = url.searchParams.get('deviceId');

  // (3) افتح الاتصال قاعدة البيانات
  const db = await getConnection();

  // (4) عدّ إجمالي الطلبات (لصفحات النتائج)
  const totalResult = await db
    .request()
    .query(`
      SELECT COUNT(*) AS total
      FROM dbo.Requests
      WHERE Status IN (N'قيد الإستلام', N'استلم')
    `);
  const total = totalResult.recordset[0].total;

  // (5) جهّز الاستعلام الرئيسي
  const ps    = db.request();
  ps.input('offset',   sql.Int, offset);
  ps.input('pageSize', sql.Int, pageSize);

  let query = `
    SELECT
      r.RequestID       AS RequestID,
      r.Title           AS Title,
      r.Status          AS Status,
      r.service         AS service,
      r.RequestDate     AS RequestDate,
      r.DivisionName    AS divisionName,
      r.DepartmentName  AS departmentName,
      r.SectionName     AS sectionName,
      d.id_dvises       AS deviceId,
      t.dv_type         AS deviceType,
      d.no_dv           AS deviceNo,
      desc2.description_dv AS deviceDesc
    FROM dbo.Requests r
    JOIN dbo.T_dvises d
      ON r.DeviceId = d.id_dvises
    JOIN dbo.T_devc_type t
      ON d.type_dv = t.id_d_t
    LEFT JOIN dbo.T_description_dv desc2
      ON d.description_dv2 = desc2.id_descript
  `;

  if (devIdStr) {
    // فلترة على جهاز واحد
    const devId = parseInt(devIdStr, 10);
    ps.input('deviceId', sql.Int, devId);
    query += ` WHERE r.DeviceId = @deviceId`;
  } else {
    // فلترة حسب الحالة الافتراضية
    query += ` WHERE r.Status IN ( N'قيد التوجيه',N'معلق')`;
  }

  query += `
    ORDER BY r.RequestDate DESC
    OFFSET @offset ROWS
    FETCH NEXT @pageSize ROWS ONLY
  `;

  try {
    const { recordset } = await ps.query(query);

    // ترجيع البيانات + معلومات الـ pagination
    return NextResponse.json({ total, page, pageSize, data: recordset });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
