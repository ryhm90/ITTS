import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload: any = jwt.verify(token, process.env.JWT_SECRET!);

  const db = await getConnection();
  await db.query`
    UPDATE Messages
    SET IsRead = 1
    WHERE ToUserID = ${payload.id} AND IsRead = 0
  `;

  return NextResponse.json({ success: true });
}
