import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';

export async function GET(
   req: NextRequest,
  context: any 
) {
  const { id } = context.params;
  const toUserId = Number(id);

  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
    const currentUserId = payload.id;

    const db = await getConnection();

    const result = await db.query`
      SELECT * FROM Messages
      WHERE (FromUserID = ${currentUserId} AND ToUserID = ${toUserId})
         OR (FromUserID = ${toUserId} AND ToUserID = ${currentUserId})
      ORDER BY SentAt ASC
    `;

    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error('❌ Error loading chat messages:', error);
    return NextResponse.json({ error: 'فشل تحميل الرسائل' }, { status: 500 });
  }
}

export async function POST(
 req: NextRequest,
  context: any 
) {
  const { id } = context.params;
  const toUserId = Number(id);

  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
    const fromUserId = payload.id;

    const { messageText, imageUrl } = await req.json();

    const db = await getConnection();

    const insert = await db.query`
      INSERT INTO Messages (FromUserID, ToUserID, MessageText, ImageUrl, SentAt, IsRead, GroupID)
      OUTPUT INSERTED.*
      VALUES (
        ${fromUserId},
        ${toUserId},
        ${messageText || ''},
        ${imageUrl || null},
        GETDATE(),
        0,
        NULL
      )
    `;

    return NextResponse.json(insert.recordset[0]);
  } catch (err) {
    console.error('❌ Error sending message:', err);
    return NextResponse.json({ error: 'فشل إرسال الرسالة' }, { status: 500 });
  }
}
