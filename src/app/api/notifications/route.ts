// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // 1) مصادقة
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  const userRole  = payload.role;
  const userEmpId = payload.id;

  // 2) pagination
  const url      = new URL(req.url);
  const page     = parseInt(url.searchParams.get('page')     || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const offset   = (page - 1) * pageSize;

  try {
    const db = await getConnection();

    // أحصاء الإجمالي
    const { recordset: cnt } = await db
      .request()
      .input('empId', sql.Int, userEmpId)
      .query(`
        SELECT COUNT(*) AS Total
        FROM Notifications
        WHERE RecipientID = @empId
          ${userRole === 'جهة مستفيدة' ? "AND ChangeType <> N'تعليق'" : ''}
      `);
    const total = cnt[0]?.Total ?? 0;
    // جلب الصفحة المطلوبة
    const { recordset } = await db
      .request()
      .input('empId',  sql.Int, userEmpId)
      .input('offset', sql.Int, offset)
      .input('fetch',  sql.Int, pageSize)
      .query(`
        WITH LatestNotifications AS (
  SELECT
    ID,
    RequestID,
    ChangeType,
    CreatedAt,
    IsRead,
    Metadata,
    ROW_NUMBER() OVER (
      PARTITION BY RequestID, RecipientID
      ORDER BY CreatedAt DESC
    ) AS rn
  FROM Notifications
  WHERE RecipientID = @empId
    ${userRole === 'جهة مستفيدة' ? "AND ChangeType <> N'تعليق'" : ''}
)
SELECT
  ID,
  RequestID,
  ChangeType,
  CreatedAt,
  IsRead,
  Metadata
FROM LatestNotifications
WHERE rn = 1
ORDER BY IsRead ASC, CreatedAt DESC
OFFSET @offset ROWS
FETCH NEXT @fetch ROWS ONLY;

      `);

    const items = recordset.map((r: any) => ({
      id:        r.ID,
      requestId: r.RequestID,
      changeType:r.ChangeType,
      createdAt: r.CreatedAt,
      isRead:    !!r.IsRead,
      metadata:  JSON.parse(r.Metadata || '{}'),
    }));

    return NextResponse.json({ total, items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
