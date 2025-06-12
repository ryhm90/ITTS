// File: /src/app/api/admin/requests/[id]/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

type HistoryBody = {
  actionType: 'تعليق' | 'تحويل' | 'تغير حالة' | 'طلب جديد';
  actionNote?: string;
};

export async function POST(req: NextRequest, context: any) {
  // 1) مصادقة المستخدم عبر JWT
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
  const actorName = payload.name; // لاسم من قام بالإجراء

  // 2) استخراج requestId من معرّف المسار
  const { id } = context.params;
  const requestId = Number(id);
  if (!requestId) {
    return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
  }

  // 3) قراءة body المحتوي على actionType و actionNote (اختياري)
  let body: HistoryBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { actionType, actionNote } = body;
  if (!actionType) {
    return NextResponse.json({ error: 'Missing actionType' }, { status: 400 });
  }

  // 4) نفتح اتصالًا بقاعدة البيانات ونبدأ Transaction
  const pool = await getConnection();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const request = transaction.request();

    // 4b) جلب جميع مسؤولي الوحدات المرتبطين بهذا الطلب
    const handlersUnitResult = await request
      .input('requestIdu', sql.Int, requestId)
      .query(`
    SELECT u.UserID as EmpID, chu.CurrentHandlerRole
    FROM CurrentHandlerRoleUnit chu
    JOIN [Users] u ON u.UnitId = chu.CurrentHandlerRoleID
    WHERE chu.RequestID = @requestIdu
    GROUP BY u.UserID, chu.CurrentHandlerRole;
      `);
    const handlersUnit: { EmpID: number; CurrentHandlerRole: string }[] =
      handlersUnitResult.recordset;

    // 4c) جلب جميع مديري الشعب المرتبطين بهذا الطلب
    const handlersSectionResult = await request
      .input('requestIdDs', sql.Int, requestId)
      .query(`
            SELECT u.UserID as EmpID, chd.CurrentHandlerRole
    FROM CurrentHandlerRoleDivision chd
    JOIN [Users] u ON u.DepartmentId = chd.CurrentHandlerRoleID
    WHERE chd.RequestID = @requestIdDs
    GROUP BY u.UserID, chd.CurrentHandlerRole;

      `);
    const handlersSection: { EmpID: number; CurrentHandlerRole: string }[] =
      handlersSectionResult.recordset;

    // 4d) جلب رقم الجهة المستفيدة (RequesterID) من جدول Requests
    const reqInfoRes = await request
      .input('requestIdRq', sql.Int, requestId)
      .query(`
        SELECT RequesterID AS CreatedByEmpID
        FROM Requests
        WHERE RequestID = @requestIdRq;
      `);
    if (reqInfoRes.recordset.length === 0) {
      throw new Error('Request not found');
    }
    const CreatedByEmpID: number = reqInfoRes.recordset[0].CreatedByEmpID;

    // 4e) جلب رقم مدير القسم (role = 'مدير قسم')
    const deptMgrRes = await request
      .input('roleDM', sql.NVarChar, 'مدير قسم')
      .query(`
        SELECT UserID AS ManagerEmpID
        FROM Users
        WHERE role = @roleDM;
      `);
    const departmentManagerID: number | null =
      deptMgrRes.recordset[0]?.ManagerEmpID ?? null;

    // 5) تجميع قائمة المستفيدين من الإشعار (recipients)
    //    (a) مسؤولو الوحدة  – CurrentHandlerRole = 'مسؤول وحدة'
    //    (b) مدراء الشعب    – CurrentHandlerRole = 'مدير شعبة'
    //    (c) دائمًا مدير القسم (إن وجد)
    //    (d) دائمًا الجهة المستفيدة (RequesterID) لأي إجراء
    type Recipient = { role: string; empId: number };
    const toNotify: Recipient[] = [];

    for (const row of handlersUnit) {
      if (row.CurrentHandlerRole === 'مسؤول وحدة') {
        toNotify.push({ role: 'مسؤول وحدة', empId: row.EmpID });
      }
    }

    for (const row of handlersSection) {
      if (row.CurrentHandlerRole === 'مدير شعبة') {
        toNotify.push({ role: 'مدير شعبة', empId: row.EmpID });
      }
    }

    if (departmentManagerID) {
      toNotify.push({ role: 'مدير قسم', empId: departmentManagerID });
    }

    // دائمًا الجهة المستفيدة
    toNotify.push({ role: 'جهة مستفيدة', empId: CreatedByEmpID });

    // 6) إدراج صف لكل مستفيد في جدول Notifications دون تكرار
    const seen = new Set<string>();
    for (const rec of toNotify) {
      const key = `${rec.role}#${rec.empId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // بناء رسالة التنبيه (message) بناءً على نوع الإجراء
      let messageText: string;
      if (actionType === 'تعليق') {
        messageText = `تم إضافة تعليق جديد على الطلب #${requestId}`;
      } else if (actionType === 'تحويل') {
        messageText = `تم تحويل الطلب #${requestId}`;
      } else if (actionType === 'طلب جديد') {
        messageText = `تم اضافة طلب جديد #${requestId}`;
      } else {
        messageText = `تغيرت حالة الطلب #${requestId}`;
      }

      const meta = {
        message: messageText,
        link: `/division/requests/${requestId}`
      };

      const notifReq = transaction.request();
      await notifReq
        .input('requestIdN', sql.Int, requestId)
        .input('changeTypeN', sql.NVarChar, actionType)
        .input('roleN', sql.NVarChar, rec.role)
        .input('empIdN', sql.Int, rec.empId)
        .input('metadataN', sql.NVarChar, JSON.stringify(meta))
        .query(`
          INSERT INTO Notifications
            (RequestID, ChangeType, CreatedAt, IsRead, RecipientRole, RecipientID, Metadata)
          VALUES
            (@requestIdN, @changeTypeN, GETDATE(), 0, @roleN, @empIdN, @metadataN);
        `);
    }


    // 7) إتمام الـ Transaction
    await transaction.commit();
  } catch (err) {
    console.error('Transaction error:', err);
    try {
      await transaction.rollback();
    } catch {
      // في حال فشل الـ rollback
    }
    return NextResponse.json(
      { error: 'Failed to insert history or notifications' },
      { status: 500 }
    );
  }

  // 8) رد النجاح
  return NextResponse.json({ success: true });
}
