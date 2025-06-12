import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 2) استخراج groupId من المسار
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const groupId = segments[segments.length - 1];

  try {
    const db = await getConnection();
    const result = await db.query`
      SELECT * FROM Messages
      WHERE GroupID = ${groupId}
      ORDER BY SentAt ASC
    `;

    return NextResponse.json({ messages: result.recordset });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
