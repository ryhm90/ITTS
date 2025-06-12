// src/app/api/notifications/unread-count/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // 1) مصادقة عبر JWT
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
  const userRole  = payload.role;
  const userEmpId = payload.id;

  // 2) استعلام عدد التنبيهات غير المقروءة
  try {
    const db = await getConnection();
    const request = db.request()
      .input('empId', sql.Int, userEmpId);

    // إذا كانت الجهة المستفيدة، نستثني تنبيهات "تعليق"
    const filterComment = userRole === 'جهة مستفيدة'
      ? `AND ChangeType <> N'تعليق'`
      : ``;

    const { recordset } = await request.query(`
      SELECT COUNT(*) AS UnreadCount
      FROM Notifications
      WHERE RecipientID = @empId
        AND IsRead = 0
        ${filterComment};
    `);

    const count = recordset[0]?.UnreadCount ?? 0;
    return NextResponse.json({ unreadCount: count });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
