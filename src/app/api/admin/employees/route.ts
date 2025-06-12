export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Only Department Manager (مدير قسم)
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  if (payload.role !== 'مدير قسم') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch employees for this department
  const db = await getConnection();
  const { recordset } = await db
    .request()
    .input('deptId', sql.Int, payload.department.id)
    .query(`
      SELECT
        SectionEmployeeID,
        UserID,
        FullName,
        Username,
        SectionName,
        IsActive
      FROM dbo.T_section_employees
      WHERE DepartmentId = @deptId
      ORDER BY SectionEmployeeID
    `);

  return NextResponse.json(recordset);
}

export async function POST(req: NextRequest) {
  // Only Department Manager
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  if (payload.role !== 'مدير قسم') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Read new-employee data from body
  const {
    UserID,
    FullName,
    Username,
    SectionId,
    SectionName,
    UnitId,
    UnitName
  }: {
    UserID: number;
    FullName: string;
    Username: string;
    SectionId: number;
    SectionName: string;
    UnitId: number;
    UnitName: string;
  } = await req.json();

  const db = await getConnection();
  await db
    .request()
    .input('UserID', sql.Int, UserID)
    .input('FullName', sql.NVarChar(255), FullName)
    .input('Username', sql.NVarChar(100), Username)
    .input('Role', sql.NVarChar(50), 'موظف')
    .input('DivisionId', sql.Int, payload.division.id)
    .input('DivisionName', sql.NVarChar(100), payload.division.name)
    .input('DepartmentId', sql.Int, payload.department.id)
    .input('DepartmentName', sql.NVarChar(100), payload.department.name)
    .input('SectionId', sql.Int, SectionId)
    .input('SectionName', sql.NVarChar(100), SectionName)
    .input('UnitId', sql.Int, UnitId)
    .input('UnitName', sql.NVarChar(100), UnitName)
    .input('IsActive', sql.Bit, 1)
    .query(`
      INSERT INTO dbo.T_section_employees
        (UserID, FullName, Username, Role,
         DivisionId, DivisionName,
         DepartmentId, DepartmentName,
         SectionId, SectionName,UnitId,UnitName,
         IsActive)
      VALUES
        (@UserID, @FullName, @Username, @Role,
         @DivisionId, @DivisionName,
         @DepartmentId, @DepartmentName,
         @SectionId, @SectionName,@UnitId, @UnitName,
         @IsActive)
    `);

  return NextResponse.json({ success: true });
}
