// src/app/api/division/requests/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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
  if (payload.role !== 'مدير شعبة') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2) وصلنا للشعبة
  const sectionId = payload.section.id;

  // 3) قارئ براميترات التقسيم للصفحات من الـ query
  const url = new URL(req.url);
  const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSizeParam = parseInt(url.searchParams.get('pageSize') || '10', 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const pageSize = isNaN(pageSizeParam) || pageSizeParam < 1 ? 10 : pageSizeParam;
  const offset = (page - 1) * pageSize;

  // 4) تجهيز الاستعلام مع العدّ وإضافة OFFSET/FETCH
  // نستخدم COUNT(*) OVER() لإرجاع العدد الكلي بجانب كل صف
  const db = await getConnection();
  const ps = db.request()
    .input('secId', sql.Int, sectionId)
    .input('offset', sql.Int, offset)
    .input('fetch', sql.Int, pageSize);

  const query = `
    SELECT
      r.RequestID          AS RequestID,
      r.Title              AS Title,
      r.Status             AS Status,
      r.service            AS service,
      r.RequestDate        AS RequestDate,
      r.DivisionName       AS divisionName,
      r.DepartmentName     AS departmentName,
      r.SectionName        AS sectionName,
      d.id_dvises          AS deviceId,
      t.dv_type            AS deviceType,
      d.no_dv              AS deviceNo,
      desc2.description_dv AS deviceDesc,
      COUNT(*) OVER()      AS TotalCount
    FROM dbo.Requests r
    INNER JOIN dbo.CurrentHandlerRoleDivision chd
      ON chd.RequestID = r.RequestID
    JOIN dbo.T_dvises d
      ON r.DeviceId = d.id_dvises
    JOIN dbo.T_devc_type t
      ON d.type_dv = t.id_d_t
    LEFT JOIN dbo.T_description_dv desc2
      ON d.description_dv2 = desc2.id_descript
    WHERE chd.CurrentHandlerRoleID = @secId
      AND r.Status IN (N'تم التوجيه')
    ORDER BY r.RequestDate DESC
    OFFSET @offset ROWS
    FETCH NEXT @fetch ROWS ONLY;
  `;

  try {
    const { recordset } = await ps.query(query);

    // إذا لم توجد نتائج، نرجّع مصفوفة فارغة ومجموع صفر
    if (recordset.length === 0) {
      return NextResponse.json({
        items: [],
        total: 0
      });
    }

    // الرقم الكلي يكون في الحقل TotalCount للصف الأول
    const totalCount = recordset[0].TotalCount as number;

    // نبني المصفوفة النهائية بدون الحقل TotalCount
    const items = recordset.map(row => ({
      RequestID: row.RequestID,
      Title: row.Title,
      Status: row.Status,
      service: row.service,
      RequestDate: row.RequestDate,
      divisionName: row.divisionName,
      departmentName: row.departmentName,
      sectionName: row.sectionName,
      deviceId: row.deviceId,
      deviceType: row.deviceType,
      deviceNo: row.deviceNo,
      deviceDesc: row.deviceDesc,
    }));

    return NextResponse.json({
      items,
      total: totalCount
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
