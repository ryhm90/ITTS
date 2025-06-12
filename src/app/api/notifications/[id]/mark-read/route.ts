// File: /src/app/api/notifications/[id]/mark-read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, context: any) {
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
  const userEmpId = payload.id;

  // 2) Read notification ID from URL param
  const { id } = context.params;          // id comes from [id] in folder name
  const notificationId = Number(id);
  if (!notificationId) {
    return NextResponse.json({ error: 'Missing or invalid notification ID' }, { status: 400 });
  }

  // 3) Mark that notification as read for this user
  try {
    const db = await getConnection();
    const request = db.request()
      .input('id', sql.Int, notificationId)
      .input('empId', sql.Int, userEmpId);

    const result = await request.query(`
      UPDATE Notifications
      SET IsRead = 1
      WHERE ID = @id
        AND RecipientID = @empId;
    `);

    // If you want, you can check result.rowsAffected to ensure one row was updated
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DB error marking notification read:', e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
