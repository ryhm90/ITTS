import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { groupName, members, description } = await req.json();

  try {
    const db = await getConnection();

    const inviteCode = randomUUID();

    const groupResult = await db.query`
      INSERT INTO ChatGroups (GroupName, InviteCode, Description)
      OUTPUT INSERTED.GroupID
      VALUES (${groupName}, ${inviteCode}, ${description || ''})
    `;

    const groupId = groupResult.recordset[0].GroupID;

    // إضافة الأعضاء
    for (const memberId of members) {
      await db.query`
        INSERT INTO GroupMembers (GroupID, UserID, IsAdmin)
        VALUES (${groupId}, ${memberId}, 0)
      `;
    }

    // إضافة منشئ المجموعة كمشرف
    await db.query`
      INSERT INTO GroupMembers (GroupID, UserID, IsAdmin)
      VALUES (${groupId}, ${payload.id}, 1)
    `;

    return NextResponse.json({ groupId });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
