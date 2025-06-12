// src/app/api/division/employees/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 1) تحقق من وجود التوكن
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2) فكّ التوكن وتأكد من دور "مدير شعبة"
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  if (payload.role !== 'مدير شعبة') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3) جلب معرّف الشعبة من البايلود
  const sectionId = payload.section.id as number;

  // 4) قراءة unitId إن وُجد في query string
  const url = new URL(req.url);
  const unitIdParam = url.searchParams.get('unitId');
  const hasUnitFilter = unitIdParam !== null;
  const unitId = hasUnitFilter ? parseInt(unitIdParam, 10) : null;
  if (hasUnitFilter && isNaN(unitId!)) {
    return NextResponse.json({ error: 'Invalid unitId' }, { status: 400 });
  }

  // 5) استعلام الموظفين من جدول T_section_employees (مع فلترة على الوحدة إذا لزم)
  const db = await getConnection();
  const ps = db.request()
    .input('secId', sql.Int, sectionId);

  let query = `
    SELECT
      SectionEmployeeID,
      UserID,
      FullName,
      Username,
      IsActive
    FROM dbo.T_section_employees
    WHERE SectionId = @secId
  `;

  if (hasUnitFilter) {
    ps.input('unitId', sql.Int, unitId!);
    query += `
      AND UnitId = @unitId
    `;
  }

  query += `
    ORDER BY FullName
  `;

  try {
    const { recordset } = await ps.query(query);
    return NextResponse.json(recordset);
  } catch (err) {
    console.error('Error fetching division employees:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
