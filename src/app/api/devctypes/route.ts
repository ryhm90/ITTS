// app/api/devctypes/route.ts
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
export const dynamic = 'force-dynamic';

export async function GET() {
  const pool = await getConnection();
  const { recordset } = await pool
    .request()
    .query("SELECT id_d_t AS id, dv_type AS name FROM dbo.T_devc_type ORDER BY id_d_t");
  return NextResponse.json(recordset);
}
