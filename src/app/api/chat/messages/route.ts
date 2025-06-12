import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  
    const db = await getConnection();
    const result = await db.query`
      SELECT * FROM Messages
      WHERE (FromUserID = ${payload.id} OR ToUserID = ${payload.id})
      ORDER BY SentAt ASC
    `;
  
    return NextResponse.json({
      messages: result.recordset,
      currentUserId: payload.id,
    });
  }
  