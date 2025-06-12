// src/app/api/division/requests/[id]/forward/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';
import sql from 'mssql';

interface ForwardEmployee {
  id: number;
  name: string;
  note: string;
}
interface ForwardItem {
  divisionID: number;
  division:   string;
  employees:  ForwardEmployee[];
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1) مصادقة
    const token = req.cookies.get('token')?.value;
    if (!token) 
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (payload.role !== 'مدير شعبة') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2) استخراج requestId
    const { id } = await params;
    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    // 3) قراءة الـ body
    const { forwards } = await req.json() as { forwards: ForwardItem[] };
    if (!Array.isArray(forwards) || forwards.length === 0) {
      return NextResponse.json({ error: 'forwards must be a non-empty array' }, { status: 400 });
    }

    const pool = await getConnection();
    const actor = `${payload.role} - ${payload.section.name} - ${payload.fullName || payload.name}`;
    
    // 4) لكل وحدة، ولكل موظف داخلها: أدخل صفّاً في CurrentHandlerRoleUnit واستعمل EmpId/EmpName
    for (const fw of forwards) {
      for (const e of fw.employees) {
        // 4.a) CurrentHandlerRoleUnit
        await pool.request()
          .input('requestId', sql.Int,           requestId)
          .input('roleId',    sql.Int,           fw.divisionID)      // CurrentHandlerRoleID
          .input('roleName',  sql.NVarChar(255), fw.division)        // CurrentHandlerRole
          .input('EmpId',     sql.Int,           e.id)               // EmpId
          .input('EmpName',   sql.NVarChar(150), e.name)             // EmpName
          .input('notes',     sql.NVarChar(sql.MAX), e.note || '')   // Notes = ملاحظة الموظف
          .query(`
            INSERT INTO dbo.CurrentHandlerRoleUnit
              (RequestID, CurrentHandlerRoleID, CurrentHandlerRole, EmpId, EmpName, Notes)
            VALUES
              (@requestId, @roleId, @roleName, @EmpId, @EmpName, @notes);
          `);

        // 4.b) RequestHistory
        const actionNote = `${e.name}${e.note ? `  /  ${e.note}` : ''}`;
        await pool.request()
          .input('requestId', sql.Int,           requestId)
          .input('actionBy',  sql.NVarChar(200), actor)
          .input('actionType',sql.NVarChar(200), `تحويل إلى ${fw.division}`)
          .input('actionNote',sql.NVarChar(sql.MAX), actionNote)
          .query(`
            INSERT INTO dbo.RequestHistory
              (RequestID, ActionBy, ActionType, ActionNote)
            VALUES
              (@requestId, @actionBy, @actionType, @actionNote);
          `);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in division forward route:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
