import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import sql from "mssql";
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const departmentId = new URL(req.url).searchParams.get("departmentId");
  const pool = await getConnection();
  const ps = pool.request();
  let q = `
    SELECT id3 AS id, section AS name, id2 AS departmentId
      FROM dbo.T_section
  `;
  if (departmentId) {
    ps.input("departmentId", sql.Int, +departmentId);
    q += " WHERE id2 = @departmentId";
  }
  q += " ORDER BY id3";
  const { recordset } = await ps.query(q);

  return NextResponse.json(recordset);
}
