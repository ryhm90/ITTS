// src/app/api/chat/group/[groupId]/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import sql from 'mssql';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // 1) مصادقة الـ JWT
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 2) استخراج groupId من المسار (مثلاً "/api/chat/group/123/update")
  const segments = new URL(request.url).pathname.split('/');
  const rawGroupId = segments[segments.indexOf('group') + 1];
  const groupId = Number(rawGroupId);
  if (isNaN(groupId)) {
    return NextResponse.json({ error: 'Invalid groupId' }, { status: 400 });
  }

  // 3) قراءة الـ formData
  const formData = await request.formData();
  const groupName   = (formData.get('groupName')   as string) || '';
  const description = (formData.get('description') as string) || '';
  const imageFile   = formData.get('image') as File | null;

  if (!groupName.trim() || !description.trim()) {
    return NextResponse.json({ error: 'groupName and description are required' }, { status: 400 });
  }

  const db = await getConnection();
  // 4) تأكد أن الراسل مشرف
  const checkAdmin = await db.request()
    .input('gId', sql.Int, groupId)
    .input('uId', sql.Int, payload.id)
    .query(`
      SELECT 1 FROM GroupMembers
      WHERE GroupID = @gId AND UserID = @uId AND IsAdmin = 1
    `);
  if (checkAdmin.recordset.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 5) عالج رفع الصورة (حذف القديمة إن وجدت)
  let newImagePath: string | null = null;
  if (imageFile) {
    // جلب المسار القديم
    const old = await db.request()
      .input('gId', sql.Int, groupId)
      .query(`SELECT GroupImage FROM ChatGroups WHERE GroupID = @gId`);
    const oldPath = old.recordset[0]?.GroupImage;
    if (oldPath) {
      const absOld = path.join(process.cwd(), 'public', oldPath);
      await unlink(absOld).catch(() => {});
    }

    // رفع الجديد
    const buf = Buffer.from(await imageFile.arrayBuffer());
    const filename = `${uuidv4()}-${imageFile.name}`;
    const dest = path.join(process.cwd(), 'public', 'uploads', filename);
    await writeFile(dest, buf);
    newImagePath = `/uploads/${filename}`;
  }

  // 6) تنفيذ التحديث
  if (newImagePath) {
    await db.request()
      .input('gId', sql.Int, groupId)
      .input('name', sql.NVarChar, groupName)
      .input('desc', sql.NVarChar, description)
      .input('img', sql.NVarChar, newImagePath)
      .query(`
        UPDATE ChatGroups
        SET GroupName = @name,
            Description = @desc,
            GroupImage = @img
        WHERE GroupID = @gId;
      `);
  } else {
    await db.request()
      .input('gId', sql.Int, groupId)
      .input('name', sql.NVarChar, groupName)
      .input('desc', sql.NVarChar, description)
      .query(`
        UPDATE ChatGroups
        SET GroupName = @name,
            Description = @desc
        WHERE GroupID = @gId;
      `);
  }

  return NextResponse.json({ success: true });
}
