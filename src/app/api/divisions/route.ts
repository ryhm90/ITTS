// app/api/divisions/route.ts
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
export const dynamic = 'force-dynamic';

export async function GET() {
  const pool = await getConnection();
  const { recordset } = await pool
    .request()
    .query("SELECT id1 AS id, division AS name FROM dbo.T_division ORDER BY id1");
  return NextResponse.json(recordset);
}
