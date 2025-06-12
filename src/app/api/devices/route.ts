// app/api/devices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from "@/lib/db";
import sql from "mssql";
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const typeId       = searchParams.get('typeId');
  const divisionId   = searchParams.get('divisionId');
  const departmentId = searchParams.get('departmentId');
  const sectionId    = searchParams.get('sectionId');

  const db = await getConnection();
  const ps = db.request();
  const filters: string[] = [];

  if (typeId) {
    ps.input('typeId', sql.Int, +typeId);
    filters.push('d.type_dv = @typeId');
  }
  if (divisionId) {
    ps.input('divisionId', sql.Int, +divisionId);
    filters.push('d.locat_dv_1 = @divisionId');
  }
  if (departmentId) {
    ps.input('departmentId', sql.Int, +departmentId);
    filters.push('d.locat_dv_2 = @departmentId');
  }
 // if (sectionId) {
  //  ps.input('sectionId', sql.Int, +sectionId);
   // filters.push('d.locat_dv_3 = @sectionId');
  //}

  let query = `
    SELECT
      d.id_dvises       AS id,
      d.no_dv           AS noDv,
      d.case_dv         AS caseDesc,
      t.dv_type         AS typeName,
      d.no_dv,
      desc2.description_dv AS descriptionName
    FROM dbo.T_dvises d
    JOIN dbo.T_devc_type t
      ON d.type_dv = t.id_d_t
    LEFT JOIN dbo.T_description_dv desc2
      ON d.description_dv2 = desc2.id_descript
  `;

  if (filters.length) {
    query += ' WHERE ' + filters.join(' AND ');
  }
  query += ' ORDER BY d.id_dvises';

  const { recordset } = await ps.query(query);
  return NextResponse.json(recordset);
}

export async function POST(req: Request) {
  const {
    noDv, caseDesc, typeId,
    divisionId, departmentId, sectionId,
    notes, descriptionId,
    cpu, ram, hard, vga
  } = await req.json();
  const pool = await getConnection();
  await pool.request()
    .input("noDv",         sql.BigInt,           noDv)
    .input("caseDesc",     sql.NVarChar(50),  caseDesc)
    .input("typeId",       sql.Int,           typeId)
    .input("divisionId",   sql.Int,           divisionId)
    .input("departmentId", sql.Int,           departmentId)
    .input("sectionId",    sql.Int,           sectionId)
    .input("notes",        sql.NVarChar(200), notes)
    .input("descriptionId",sql.Int,           descriptionId)
    .input("cpu",          sql.NVarChar(sql.MAX), cpu)
    .input("ram",          sql.NVarChar(sql.MAX), ram)
    .input("hard",         sql.NVarChar(sql.MAX), hard)
    .input("vga",          sql.NVarChar(sql.MAX), vga)
    .query(`
      INSERT INTO dbo.T_dvises
        (no_dv, case_dv, type_dv,
         locat_dv_1, locat_dv_2, locat_dv_3,
         notes, description_dv2,
         cpu, ram, hard, vga)
      VALUES
        (@noDv, @caseDesc, @typeId,
         @divisionId, @departmentId, @sectionId,
         @notes, @descriptionId,
         @cpu, @ram, @hard, @vga)
    `);
  return NextResponse.json({ success: true });
}

export async function PUT(req: Request) {
  const {
    id, noDv, caseDesc, typeId,
    divisionId, departmentId, sectionId,
    notes, descriptionId,
    cpu, ram, hard, vga
  } = await req.json();
  const pool = await getConnection();
  await pool.request()
    .input("id",            sql.Int,           id)
    .input("noDv",          sql.Int,           noDv)
    .input("caseDesc",      sql.NVarChar(50),  caseDesc)
    .input("typeId",        sql.Int,           typeId)
    .input("divisionId",    sql.Int,           divisionId)
    .input("departmentId",  sql.Int,           departmentId)
    .input("sectionId",     sql.Int,           sectionId)
    .input("notes",         sql.NVarChar(200), notes)
    .input("descriptionId", sql.Int,           descriptionId)
    .input("cpu",           sql.NVarChar(sql.MAX), cpu)
    .input("ram",           sql.NVarChar(sql.MAX), ram)
    .input("hard",          sql.NVarChar(sql.MAX), hard)
    .input("vga",           sql.NVarChar(sql.MAX), vga)
    .query(`
      UPDATE dbo.T_dvises
         SET no_dv           = @noDv,
             case_dv         = @caseDesc,
             type_dv         = @typeId,
             locat_dv_1      = @divisionId,
             locat_dv_2      = @departmentId,
             locat_dv_3      = @sectionId,
             notes           = @notes,
             description_dv2 = @descriptionId,
             cpu             = @cpu,
             ram             = @ram,
             hard            = @hard,
             vga             = @vga
       WHERE id_dvises = @id
    `);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const pool = await getConnection();
  await pool.request()
    .input("id", sql.Int, +id)
    .query(`DELETE FROM dbo.T_dvises WHERE id_dvises = @id`);
  return NextResponse.json({ success: true });
}
