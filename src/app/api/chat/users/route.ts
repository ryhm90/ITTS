import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
    const currentUserId = payload.id;

    const db = await getConnection();
    const result = await db.query`
      SELECT UserID, FullName, Username
      FROM Users
      WHERE UserID != ${currentUserId} AND IsActive = 1
    `;

    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error('❌ Error loading users:', error);
    return NextResponse.json({ error: 'فشل تحميل المستخدمين' }, { status: 500 });
  }
}
