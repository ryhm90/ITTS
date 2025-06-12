// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import crypto from 'crypto';
export const dynamic = 'force-dynamic';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (payload.role !== 'مدير قسم') {
      return NextResponse.json({ error: 'Forbidden - Access Denied' }, { status: 403 });
    }
  const {
    fullName,
    username,
    password,
    role,
    division,     // name
    department,   // name
    section,      // name
    divisionId,   // id
    departmentId, // id
    sectionId,     // id
    unitId,     // id
    unit
  } = await req.json();

  const db = await getConnection();

  // 1) تحقق من عدم تكرار اسم المستخدم
  const existing = await db.query`
    SELECT 1 FROM Users WHERE Username = ${username}
  `;
  if (existing.recordset.length > 0) {
    return NextResponse.json(
      { error: 'اسم المستخدم مستخدم مسبقًا' },
      { status: 400 }
    );
  }

  // 2) تشفير كلمة المرور
  const hash = crypto.createHash('sha256').update(password).digest('hex');

  // 3) إدراج السجل مع الأسماء والمعرّفات
  await db.query`
    INSERT INTO Users
      (FullName, Username, PasswordHash, Role,
       division, divisionId,
       Department, DepartmentId,
       section, sectionId,unitId,unit)
    VALUES
      (
        ${fullName},
        ${username},
        ${hash},
        ${role},
        ${division},
        ${divisionId},
        ${department},
        ${departmentId},
        ${section},
        ${sectionId},
        ${unitId},
        ${unit}
      )
  `;

  return NextResponse.json({ success: true });
}
