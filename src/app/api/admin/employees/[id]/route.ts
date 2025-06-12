export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  context: any 
) {  // Only Department Manager
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  if (payload.role !== 'مدير قسم') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = parseInt(context.params.id, 10);
  const db = await getConnection();
  await db
    .request()
    .input('id', sql.Int, id)
    .query(`DELETE FROM dbo.T_section_employees WHERE SectionEmployeeID = @id`);

  return NextResponse.json({ success: true });
}
