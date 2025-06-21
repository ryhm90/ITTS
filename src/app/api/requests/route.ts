// src/app/api/requests/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import sql from 'mssql';
import { getConnection } from '@/lib/db';
export const dynamic = 'force-dynamic';

export const config = {
  api: { bodyParser: false },
};

function makeTimestampedFilename(originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const mss = String(now.getMilliseconds()).padStart(3, '0');
  const randomPart = uuidv4().split('-')[0];
  return `${YYYY}${MM}${DD}-${hh}${mm}${ss}-${mss}-${randomPart}${ext}`;
}

export async function POST(request: NextRequest) {
  try {
    // 1) Authentication
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);

    // 2) Ensure uploads dir
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    // 3) Read formData
    const formData = await request.formData();
    const getField = (key: string) => {
      const v = formData.get(key);
      return typeof v === 'string' ? v.trim() : '';
    };
    const title       = getField('title');
    const description = getField('description');
    const service     = getField('service');
    const memoID      = getField('memoID');
    const memoDateRaw = getField('memoDate');
const deviceIdRaw = getField('deviceId');
const deviceId    = deviceIdRaw ? parseInt(deviceIdRaw, 10) : 7249;

    if ([title, description, service, memoID, memoDateRaw].some(f => !f) || isNaN(deviceId)) {
      return NextResponse.json({ error: 'الرجاء تعبئة جميع الحقول المطلوبة' }, { status: 400 });
    }

    // 4) Handle attachments
    const imageUrls: string[] = [];
    for (const file of formData.getAll('attachments')) {
      if (file instanceof File) {
        const buf = Buffer.from(await file.arrayBuffer());
        const fname = makeTimestampedFilename(file.name);
        const dest = path.join(uploadsDir, fname);
        await fs.promises.writeFile(dest, buf);
        imageUrls.push(`/uploads/${fname}`);
      }
    }

    // 5) Insert into Requests + get new RequestID
    const db = await getConnection();
    const req = db.request()
      .input('title', sql.NVarChar, title)
      .input('description', sql.NVarChar, description)
      .input('service', sql.NVarChar, service)
      .input('deviceId', sql.Int, deviceId)
      .input('memoID', sql.NVarChar, memoID)
      .input('memoDate', sql.Date, new Date(memoDateRaw))
      .input('imageUrls', sql.NVarChar, imageUrls.join(','))
      .input('requesterId', sql.Int, payload.id)
      .input('status', sql.NVarChar, 'قيد الإستلام')
      .input('currentHandlerRole', sql.NVarChar, 'قيد الانتظار')
      .input('divisionId', sql.Int, payload.division.id)
      .input('divisionName', sql.NVarChar, payload.division.name)
      .input('departmentId', sql.Int, payload.department.id)
      .input('departmentName', sql.NVarChar, payload.department.name)
      .input('sectionId', sql.Int, payload.section.id)
      .input('sectionName', sql.NVarChar, payload.section.name);

    const insertResult = await req.query(`
      INSERT INTO dbo.Requests
        (Title, Description, Status, RequestDate, RequesterID,
         CurrentHandlerRole, DivisionId, DivisionName,
         DepartmentId, DepartmentName,
         SectionId, SectionName,
         DeviceId, ImageUrls, Service, MemoID, MemoDate)
      OUTPUT CAST(SCOPE_IDENTITY() AS INT) AS RequestID
      VALUES
        (@title, @description, @status, GETDATE(), @requesterId,
         @currentHandlerRole, @divisionId, @divisionName,
         @departmentId, @departmentName,
         @sectionId, @sectionName,
         @deviceId, @imageUrls, @service, @memoID, @memoDate);
    `);
// — الآن نعيد جلب الـ RequestID عبر الاستعلام المحذوف:
const idResult = await db.request().query(`
  SELECT TOP 1 RequestID
  FROM dbo.Requests
  ORDER BY RequestID DESC;
`);
const newRequestId = idResult.recordset[0]?.RequestID;
if (!newRequestId) {
  throw new Error('فشل في استرداد RequestID الجديد');
}

// 6) إدراج الإشعار للمدير المثال:
const meta = { message: `تم اضافة طلب جديد #${newRequestId}`, link: `/dashboard?viewHistory=${newRequestId}` };
await db.request()
  .input('requestId',   sql.Int,      newRequestId)
  .input('changeType',  sql.NVarChar, 'طلب جديد')
  .input('role',        sql.NVarChar, 'مدير قسم')
  .input('empId',       sql.Int,      16)            // عدّل الـ empId حسب حاجتك
  .input('metadata',    sql.NVarChar, JSON.stringify(meta))
  .query(`
    INSERT INTO Notifications
      (RequestID, ChangeType, CreatedAt, IsRead, RecipientRole, RecipientID, Metadata)
    VALUES
      (@requestId, @changeType, GETDATE(), 0, @role, @empId, @metadata);
  `);
    return NextResponse.json(
      { success: true, requestId: newRequestId, uploaded: imageUrls },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error in POST /api/requests:', err);
    return NextResponse.json({ error: 'فشل إرسال الطلب' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // 1) Authentication
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  const userId = payload.id;

  // 2) Parse pagination params
  const url = new URL(request.url);
  const page     = parseInt(url.searchParams.get('page')     || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
  const offset   = (page - 1) * pageSize;

  try {
    const db = await getConnection();

    // 3) إجمالي عدد الطلبات للمستعلم
    const totalRes = await db
      .request()
      .input('requesterId', sql.Int, userId)
      .query(`
        SELECT COUNT(*) AS total
        FROM dbo.Requests
        WHERE RequesterID = @requesterId
      `);
    const total = totalRes.recordset[0]?.total ?? 0;

    // 4) جلب البيانات مع order + offset, fetch
    const dataRes = await db
      .request()
      .input('requesterId', sql.Int, userId)
      .input('offset',      sql.Int, offset)
      .input('fetch',       sql.Int, pageSize)
      .query(`
        SELECT
          r.RequestID      AS RequestID,
          r.Title          AS Title,
          r.Status         AS Status,
          r.RequestDate    AS RequestDate,
          r.service        AS service,
          d.id_dvises      AS deviceId,
          d.no_dv          AS deviceNo,
          t.dv_type        AS deviceType,
          desc2.description_dv AS deviceDesc
        FROM dbo.Requests r
        JOIN dbo.T_dvises d
          ON r.DeviceId = d.id_dvises
        JOIN dbo.T_devc_type t
          ON d.type_dv = t.id_d_t
        LEFT JOIN dbo.T_description_dv desc2
          ON d.description_dv2 = desc2.id_descript
        WHERE r.RequesterID = @requesterId
        ORDER BY r.RequestDate DESC
        OFFSET @offset ROWS
        FETCH NEXT @fetch ROWS ONLY;
      `);

    return NextResponse.json({
      items: dataRes.recordset,
      total,
    });
  } catch (err: any) {
    console.error('Error in GET /api/requests:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}