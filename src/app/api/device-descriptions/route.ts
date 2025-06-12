// src/app/api/device-descriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection }         from '@/lib/db';
import sql                       from 'mssql';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url      = new URL(req.url);
    const typeDv   = url.searchParams.get('type_dv');
    if (!typeDv) {
      return NextResponse.json({ error: 'Missing type_dv parameter' }, { status: 400 });
    }
    const typeId = parseInt(typeDv, 10);
    if (isNaN(typeId)) {
      return NextResponse.json({ error: 'Invalid type_dv' }, { status: 400 });
    }

    const pool = await getConnection();
    const request = pool.request();
    request.input('typeDv', sql.Int, typeId);

    const result = await request.query(`
      SELECT 
        id_descript AS id,
        description_dv AS name
      FROM dbo.T_description_dv
      WHERE type_dv = @typeDv
      ORDER BY description_dv
    `);
    // نعيد المصفوفة مباشرة ليستهلكها الـ Autocomplete
    return NextResponse.json(result.recordset);
  } catch (err) {
    console.error('Error in /api/device-descriptions:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
