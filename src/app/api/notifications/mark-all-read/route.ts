// /src/app/api/notifications/mark-all-read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // 1) Authentication
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
  const userRole = payload.role;
  const userEmpId = payload.id;

  try {
    const db = await getConnection();
    const request = db.request()
      .input('empId', sql.Int, userEmpId);

    await request.query(`
      UPDATE Notifications
      SET IsRead = 1
      WHERE 
         RecipientID = @empId;
    `);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
