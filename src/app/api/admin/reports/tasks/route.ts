import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

  if (payload.role !== 'مدير قسم') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);

  const status = searchParams.get('status');
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');
  const department = searchParams.get('department');
  const employee = searchParams.get('employee');

  let where = '1=1';

  if (status) where += ` AND Status = '${status}'`;
  if (fromDate) where += ` AND RequestDate >= '${fromDate}'`;
  if (toDate) where += ` AND RequestDate <= '${toDate}'`;
  if (department) where += ` AND Department LIKE '%${department}%'`;
  if (employee) where += ` AND EmployeeName LIKE '%${employee}%'`;

  try {
    const db = await getConnection();
    const result = await db.query(`
      SELECT RequestID, Title, Status, RequestDate
      FROM Requests
      WHERE ${where}
      ORDER BY RequestDate DESC
    `);
    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
