import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import sql from "mssql";
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const sectionId = new URL(req.url).searchParams.get("sectionId");
  const pool = await getConnection();
  const ps = pool.request();
  let q = `
    SELECT id4 AS id, unit AS name, id3 AS unitId
      FROM dbo.T_unit
  `;
  if (sectionId) {
    ps.input("sectionId", sql.Int, +sectionId);
    q += " WHERE id3 = @sectionId";
  }
  q += " ORDER BY id4";
  const { recordset } = await ps.query(q);

  return NextResponse.json(recordset);
}
