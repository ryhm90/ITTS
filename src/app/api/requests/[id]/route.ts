// app/api/requests/[id]/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // أولاً ننتظر params، ثم نفكك id
  const { id } = await context.params;
  const reqId = parseInt(id, 10);

  const db = await getConnection();
  const ps = db.request().input('id', sql.Int, reqId);

  const { recordset } = await ps.query(`
    SELECT
      RequestID      AS id,
      Title,
      Description,
      Notes
    FROM dbo.Requests
    WHERE RequestID = @id
  `);

  return NextResponse.json(recordset[0] || null);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const reqId = parseInt(id, 10);
  const { title, description } = await request.json();

  const db = await getConnection();
  await db.request()
    .input('id',           sql.Int,          reqId)
    .input('title',        sql.NVarChar(200), title)
    .input('description',  sql.NVarChar(sql.MAX), description)
    .query(`
      UPDATE dbo.Requests
        SET Title       = @title,
            Description = @description
      WHERE RequestID = @id
    `);

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const reqId = parseInt(id, 10);

  const db = await getConnection();
  await db.request()
    .input('id', sql.Int, reqId)
    .query(`
      DELETE FROM dbo.Requests
      WHERE RequestID = @id
    `);

  return NextResponse.json({ success: true });
}
