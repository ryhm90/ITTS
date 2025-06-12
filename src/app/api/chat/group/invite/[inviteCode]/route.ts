// src/app/api/chat/group/[inviteCode]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // 1) استخراج inviteCode من نهاية مسار الـ URL
  const url = new URL(request.url);
  const parts = url.pathname.split('/');
  const inviteCode = parts[parts.length - 1];
  if (!inviteCode) {
    return NextResponse.json({ error: 'Missing invite code' }, { status: 400 });
  }

  try {
    // 2) افتح اتصال لقاعدة البيانات
    const db = await getConnection();
    // 3) استعلام محمي بحقن المعاملات
    const result = await db.request()
      .input('code', sql.NVarChar, inviteCode)
      .query(`
        SELECT 
          GroupID, 
          GroupName, 
          Description, 
          GroupImage
        FROM ChatGroups
        WHERE InviteCode = @code;
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // 4) إعادة بيانات الغرفة
    return NextResponse.json({ group: result.recordset[0] });
  } catch (err) {
    console.error('Database error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
