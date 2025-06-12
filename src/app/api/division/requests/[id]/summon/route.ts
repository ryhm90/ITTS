import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
 req: NextRequest, context: any
) {

  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  if (payload.role !== 'مدير شعبة') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
      const awaitedParams = await context.params;
    const idParam = awaitedParams.id;              // مثال: "76"
    const rid = Number(idParam);
  if (isNaN(rid)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  const pool = await getConnection();
  const actor = `${payload?.role} - ${payload?.section?.name} - ${payload?.name}`;

  // 1) نغيّر حالة الطلب إلى "تم استقدام للاستلام"
  await pool.request()
    .input('rid', sql.Int, rid)
    .query(`
      UPDATE dbo.Requests
      SET Status = N'يرجى الاستلام'
      WHERE RequestID = @rid;
    `);

  // 2) نُسجّل في السجلّ
  await pool.request()
    .input('rid', sql.Int, rid)
    .input('actionBy', sql.NVarChar(200), actor)
    .input('actionType', sql.NVarChar(100), 'استقدام للاستلام')
    .input('actionNote', sql.NVarChar(sql.MAX), '')
    .query(`
      INSERT INTO dbo.RequestHistory
        (RequestID, ActionBy, ActionType, ActionNote)
      VALUES
        (@rid, @actionBy, @actionType, @actionNote);
    `);

  return NextResponse.json({ success: true });
}
