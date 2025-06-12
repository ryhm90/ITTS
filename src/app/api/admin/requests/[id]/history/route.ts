export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const id = req.nextUrl.pathname.split('/').slice(-2, -1)[0];
    const requestId = Number(id);

    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const db = await getConnection();
    const result = await db.query`
      SELECT ActionBy, ActionType, ActionNote, ActionDate
      FROM RequestHistory
      WHERE RequestID = ${requestId}
      ORDER BY ActionDate ASC
    `;

    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error('Error in GET /api/admin/requests/[id]/history:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
