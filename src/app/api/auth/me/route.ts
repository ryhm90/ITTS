// app/api/auth/me/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'No token found' }, { status: 401 });
  }

  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);

    // افصل الحقول التي تريد إرجاعها
    const {
      id,
      name,
      username,
      role,
      division,
      department,
      section,
      unit
    } = payload;
    return NextResponse.json({
      id,
      name,
      username,
      role,
      division: {
        id: division.id,
        name: division.name
      },
      department: {
        id: department.id,
        name: department.name
      },
      section: {
        id: section.id,
        name: section.name
      },
      unit: {
        id: unit.id,
        name: unit.name
      }
    });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
