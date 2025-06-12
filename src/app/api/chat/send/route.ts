import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { getIO } from '@/lib/socketServer';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { toUserId, messageText, imageUrl, groupId } = await req.json();

  const db = await getConnection();
  await db.query`
    INSERT INTO Messages (FromUserID, ToUserID, GroupID, MessageText, ImageUrl)
  VALUES (${payload.id}, ${toUserId || null}, ${groupId || null}, ${messageText}, ${imageUrl || null})
  `;

  const io = getIO();
  if (groupId) {
    io.emit(`group-${groupId}`, { from: payload.id, groupId, messageText, imageUrl });
  } else {
    io.emit('new-message', { from: payload.id, to: toUserId, messageText, imageUrl });
  }
  return NextResponse.json({ success: true });
}
