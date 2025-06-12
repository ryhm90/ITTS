import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { getIO } from '@/lib/socketServer';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  if (payload.role !== 'مدير قسم') {
    return NextResponse.json({ error: 'Forbidden - Access Denied' }, { status: 403 });
  }

  const { requestId, directiveText } = await req.json();

  try {
    const db = await getConnection();
    await db.query`
      INSERT INTO Directives (RequestID, FromUserID, DirectiveText)
      VALUES (${requestId}, ${payload.id}, ${directiveText})
    `;
    const io = getIO();
    io.emit('new-directive');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}


export async function GET(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
  
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }
  
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  
    if (payload.role !== 'مدير قسم') {
      return NextResponse.json({ error: 'Forbidden - Access Denied' }, { status: 403 });
    }
  
    try {
      const db = await getConnection();
      const result = await db.query`
        SELECT DirectiveID, RequestID, DirectiveText, CreatedAt
        FROM Directives
        ORDER BY CreatedAt DESC
      `;
      return NextResponse.json(result.recordset);
    } catch (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  }
  