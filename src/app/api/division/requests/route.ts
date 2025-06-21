// src/app/api/division/requests/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
import { roRO } from '@mui/x-date-pickers/locales';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 1) مصادقة وتحقق من صلاحية "مدير شعبة"
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

  // 2) استخراج معرف الشعبة من الـ JWT
  const sectionId = payload.section.id;

  // 3) قراءة براميترات الصفحات (page و pageSize) و requestId من الـ URL
  const url           = new URL(req.url);
  const pageParam     = parseInt(url.searchParams.get('page')     || '1',  10);
  const pageSizeParam = parseInt(url.searchParams.get('pageSize') || '10', 10);
  const page     = isNaN(pageParam)     || pageParam < 1     ? 1  : pageParam;
  const pageSize = isNaN(pageSizeParam) || pageSizeParam < 1 ? 10 : pageSizeParam;
  const offset   = (page - 1) * pageSize;

  const reqIdStr = url.searchParams.get('requestId');
  const reqId    = reqIdStr ? parseInt(reqIdStr, 10) : undefined;

  // 4) اتصال بقاعدة البيانات وإعداد الـ Prepared Statement
  const db = await getConnection();
  const ps = db.request()
    .input('secId',  sql.Int, sectionId)    // <— تصحيح: يجب להיות sectionId כאן
    .input('offset', sql.Int, offset)
    .input('fetch',  sql.Int, pageSize);

  let devId: number | undefined;

  // 5) إذا وُجد requestId، أستخرج بيانات الجهاز والخدمة من هذا الطلب
  if (reqId) {
    const ps2 = db.request().input('requestId', sql.Int, reqId);
    const descRes = await ps2.query(`
      SELECT DepartmentName, DivisionName, service, DeviceId
      FROM dbo.Requests
      WHERE RequestID = @requestId
    `);
    if (descRes.recordset.length > 0) {
      const row = descRes.recordset[0];
      devId = row.DeviceId;
      ps
        .input('DepName',  sql.NVarChar, row.DepartmentName)
        .input('DivName',  sql.NVarChar, row.DivisionName)
        .input('Service',  sql.NVarChar, row.service)
        .input('deviceId', sql.Int,      row.DeviceId);
        console.log(row.DeviceId)
    }
  }

  // 6) بناء استعلام الجلب الأساسي
  let query = `
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
  `;

  // 7) إضافة شروط WHERE حسب وجود requestId ו devId
  if (reqId) {
    if (devId !== 7249) {
      // فلترة حسب DeviceId عندما لا يساوي 7249
      console.log('0')
      query += ` WHERE r.DeviceId = @deviceId 
      GROUP BY
  r.RequestID,
  r.Title,
  r.Status,
  r.service,
  r.RequestDate,
  r.DivisionName,
  r.DepartmentName,
  r.SectionName,
  d.id_dvises,
  t.dv_type,
  d.no_dv,
  desc2.description_dv`;
      console.log('0')
    } else {
      // فلترة حسب القسم والوحدة والخدمة عندما DeviceId = 7249
      query += `
        WHERE r.DepartmentName = @DepName
          AND r.DivisionName   = @DivName
          AND r.service        = @Service
                GROUP BY
  r.RequestID,
  r.Title,
  r.Status,
  r.service,
  r.RequestDate,
  r.DivisionName,
  r.DepartmentName,
  r.SectionName,
  d.id_dvises,
  t.dv_type,
  d.no_dv,
  desc2.description_dv
      `;
      console.log('1')
    }
  } else {
    // حالة افتراضية: عرض الطلبات الموجّهة إلى هذه الشعبة
    query += `
      WHERE chd.CurrentHandlerRoleID = @secId
        AND r.Status IN (N'تم التوجيه')
    `;
    
  }

  // 8) إضافة الترتيب والحد (OFFSET / FETCH)
  query += `
    ORDER BY r.RequestDate DESC
    OFFSET @offset ROWS
    FETCH NEXT @fetch ROWS ONLY
  `;
  try {
    // 9) ביצוע השאילתה ושליפת התוצאות
    const { recordset } = await ps.query(query);
    // אם אין תוצאות
    if (recordset.length === 0) {
      return NextResponse.json({ items: [], total: 0 });
    }

    // קריאת סה"כ הרשומות מתוך השורה הראשונה
    const totalCount = recordset[0].TotalCount as number;

    // בניית המערך הסופי ללא TotalCount
    const items = recordset.map(row => ({
      RequestID:      row.RequestID,
      Title:          row.Title,
      Status:         row.Status,
      service:        row.service,
      RequestDate:    row.RequestDate,
      divisionName:   row.divisionName,
      departmentName: row.departmentName,
      sectionName:    row.sectionName,
      deviceId:       row.deviceId,
      deviceType:     row.deviceType,
      deviceNo:       row.deviceNo,
      deviceDesc:     row.deviceDesc,
    }));

    return NextResponse.json({ items, total: totalCount });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
