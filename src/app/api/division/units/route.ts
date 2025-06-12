// src/app/api/division/units/route.ts
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
    return NextResponse.json({ error: 'Unauthorized – No token' }, { status: 401 });
  }

  // 2) فك التوكن والتحقق من الصلاحية
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 3) تأكد أن المستخدم هو مدير شعبة وأن الـ payload يحتوي على section.id
  if (payload.role !== 'مدير شعبة') {
    return NextResponse.json({ error: 'Forbidden – Insufficient role' }, { status: 403 });
  }
  const sectionId = payload.section?.id;
  if (!sectionId || typeof sectionId !== 'number') {
    return NextResponse.json({ error: 'Invalid section in token' }, { status: 400 });
  }

  // 4) جلب الوحدات الخاصة بهذه الشعبة من قاعدة البيانات
  try {
    const pool = await getConnection();
    const ps = pool.request()
      .input('sectionId', sql.Int, sectionId);

    const query = `
      SELECT 
        id4 AS id,
        unit AS name,
        id3 AS sectionId
      FROM dbo.T_unit
      WHERE id3 = @sectionId
      ORDER BY id4
    `;

    const { recordset } = await ps.query(query);
    return NextResponse.json(recordset);
  } catch (error) {
    console.error('Database error fetching units:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
