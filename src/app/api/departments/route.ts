import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import sql from "mssql";
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const divisionId = new URL(req.url).searchParams.get("divisionId");
  const pool = await getConnection();
  const ps = pool.request();

  let q = `
    SELECT id2 AS id, department AS name, id1 AS divisionId
      FROM dbo.T_department
  `;
  if (divisionId) {
    ps.input("divisionId", sql.Int, +divisionId);
    q += " WHERE id1 = @divisionId";
  }
  q += " ORDER BY id2";

  const { recordset } = await ps.query(q);
  return NextResponse.json(recordset);
}
