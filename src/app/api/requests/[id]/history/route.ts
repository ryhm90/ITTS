// src/app/api/requests/[id]/history/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1) Authentication: require a valid token
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 2) Await params and parse request ID
  const { id } = await params;
  const requestId = parseInt(id, 10);
  if (isNaN(requestId)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  try {
    // 3) Query RequestHistory, excluding comments
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('rid', sql.Int, requestId)
      .input('excludeType', sql.NVarChar(50), 'تعليق')
      .query<{
        ActionBy: string;
        ActionType: string;
        ActionNote?: string;
        ActionDate: Date;
      }>(`
        SELECT
          ActionBy,
          ActionType,
          ActionNote,
          ActionDate
        FROM dbo.RequestHistory
        WHERE RequestID = @rid
          AND ActionType <> @excludeType
        ORDER BY ActionDate ASC
      `);

    return NextResponse.json(result.recordset);
  } catch (err) {
    console.error('Error fetching history for request', requestId, err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
