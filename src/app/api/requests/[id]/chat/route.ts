// src/app/api/rejection-chats/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

function extractId(pathname: string): number | null {
  const m = pathname.match(/\/api\/rejection-chats\/(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

export async function GET(request: NextRequest) {
  // 1) مصادقة عبر Authorization header
  const auth = request.headers.get('authorization') || '';
  const token = auth.split(' ')[1] || '';
  try {
    jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2) استخراج RequestID من المسار
  const requestId = extractId(request.nextUrl.pathname);
  if (requestId === null) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  // 3) جلب الرسائل
  try {
    const db = await getConnection();
    const result = await db.query<{
      ChatID: number;
      Message: string;
      SentAt: Date;
      SenderName: string;
      SenderID: number;
    }>`SELECT 
        c.ChatID, 
        c.Message, 
        c.SentAt, 
        u.FullName AS SenderName, 
        c.SenderID
      FROM RejectionChats c
      JOIN Users u ON u.UserID = c.SenderID
      WHERE c.RequestID = ${requestId}
      ORDER BY c.SentAt ASC;`;

    return NextResponse.json(result.recordset);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // 1) مصادقة
  const auth = request.headers.get('authorization') || '';
  const token = auth.split(' ')[1] || '';
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2) استخراج RequestID من المسار
  const requestId = extractId(request.nextUrl.pathname);
  if (requestId === null) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  // 3) قراءة الرسالة من body
  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.message || !body.message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  // 4) إدراج الرسالة
  try {
    const db = await getConnection();
    await db.query`INSERT INTO RejectionChats (RequestID, SenderID, Message)
      VALUES (${requestId}, ${payload.id}, ${body.message.trim()});`;
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
