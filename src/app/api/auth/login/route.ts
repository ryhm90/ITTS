// app/api/auth/login/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const db = await getConnection();

    // هشّ كلمة المرور
    const hashed = crypto.createHash('sha256').update(password).digest('hex');

    // جلب بيانات المستخدم مع الأسماء والمعرّفات
    const result = await db.query`
      SELECT TOP 1
        UserID     AS userId,
        FullName   AS fullName,
        Username   AS username,
        Role       AS role,
        division   AS divisionName,
        divisionId AS divisionId,
        Department AS departmentName,
        departmentId AS departmentId,
        section    AS sectionName,
        sectionId  AS sectionId,
        unit    AS unitName,
        unitId  AS unitId,

        IsActive   AS isActive
      FROM Users
      WHERE Username = ${email} AND PasswordHash = ${hashed}
    `;
    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    const user = result.recordset[0];

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'هذا الحساب غير مفعل. يرجى التواصل مع الإدارة.' },
        { status: 403 }
      );
    }

    // إنشاء الـ JWT مع الـ IDs والأسماء
    const token = jwt.sign(
      {
        id: user.userId,
        name: user.fullName,
        username: user.username,
        role: user.role,
        division:   { id: user.divisionId,   name: user.divisionName },
        department: { id: user.departmentId, name: user.departmentName },
        section:    { id: user.sectionId,    name: user.sectionName },
        unit:    { id: user.unitId,    name: user.unitName },

      },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    const response = NextResponse.json({ success: true });
    response.cookies.set('token', token, {
      httpOnly: true,
      maxAge: 60 * 60 * 24,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تسجيل الدخول' },
      { status: 500 }
    );
  }
}
