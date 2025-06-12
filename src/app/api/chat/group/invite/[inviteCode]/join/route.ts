import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
  // 2) استخراج inviteCode من المسار
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const inviteCode = segments[segments.length - 1];

  try {
    const db = await getConnection();
    const groupResult = await db.query`
      SELECT GroupID FROM ChatGroups
      WHERE InviteCode = ${inviteCode}
    `;

    if (groupResult.recordset.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const groupId = groupResult.recordset[0].GroupID;

    // تحقق إذا كان موجود بالفعل
    const existing = await db.query`
      SELECT * FROM GroupMembers
      WHERE GroupID = ${groupId} AND UserID = ${payload.id}
    `;

    if (existing.recordset.length === 0) {
      await db.query`
        INSERT INTO GroupMembers (GroupID, UserID, IsAdmin)
        VALUES (${groupId}, ${payload.id}, 0)
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
