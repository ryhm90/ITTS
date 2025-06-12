// app/api/devices/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getConnection } from "@/lib/db";
import sql from "mssql";
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // نقرأ الـ id من آخر جزء في الـ pathname
  const parts = request.nextUrl.pathname.split("/");
  const idPart = parts[parts.length - 1];
  const id = parseInt(idPart, 10);

  const pool = await getConnection();
  const ps = pool.request().input("id", sql.Int, id);

  const { recordset } = await ps.query(`
    SELECT
      d.id_dvises         AS id,
      t.id_d_t            AS typeId,
      t.dv_type           AS typeName,
      d.no_dv             AS noDv,

      dv.id1              AS divisionId,
      dv.division         AS divisionName,

      dp.id2              AS departmentId,
      dp.department       AS departmentName,

      sec.id3             AS sectionId,
      sec.section         AS sectionName,

      d.case_dv           AS caseDesc,
      d.notes             AS notes,

      d.description_dv2   AS descriptionId,
      desc2.description_dv AS descriptionName,

      d.cpu               AS cpu,
      d.ram               AS ram,
      d.hard              AS hard,
      d.vga               AS vga
    FROM dbo.T_dvises d
    JOIN dbo.T_devc_type t
      ON d.type_dv = t.id_d_t
    LEFT JOIN dbo.T_division dv
      ON d.locat_dv_1 = dv.id1
    LEFT JOIN dbo.T_department dp
      ON d.locat_dv_2 = dp.id2
    LEFT JOIN dbo.T_section sec
      ON d.locat_dv_3 = sec.id3
    LEFT JOIN dbo.T_description_dv desc2
      ON d.description_dv2 = desc2.id_descript
    WHERE d.id_dvises = @id
  `);

  return NextResponse.json(recordset[0] || null);
}
