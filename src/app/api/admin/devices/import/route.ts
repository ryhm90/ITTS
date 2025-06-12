// src/app/api/admin/devices/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection }          from '@/lib/db';
import sql                        from 'mssql';
import * as XLSX                  from 'xlsx';
export const dynamic = 'force-dynamic';

export const config = {
  api: {
    bodyParser: false, // we’ll consume the body as multipart ourselves
  },
};

export async function POST(req: NextRequest) {
  let transaction: sql.Transaction | null = null;
  try {
    // 1) pull the file out of the incoming multipart form
    const formData = await req.formData();
    const file     = formData.get('file');
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 2) turn it into a Buffer for xlsx
    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    // 3) parse the workbook
    const wb    = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows  = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
    const dataRows = rows.slice(1); // skip header

    // 4) start a DB transaction
    const pool = await getConnection();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    for (const row of dataRows) {
      const [
        typeName,
        noDv,
        descName,
        caseStatus,
        divisionName,
        departmentName,
        sectionName,
        cpu = '',
        ram = '',
        hard = '',
        vga = '',
        notes = '',
      ] = row;

      // --- upsert device type ---
      const tr1 = transaction.request();
      tr1.input('typeName', sql.NVarChar(100), (typeName as string).trim());
      let res1 = await tr1.query(`
        SELECT id_d_t FROM dbo.T_devc_type
         WHERE dv_type = @typeName
      `);
      let typeId: number;
      if (res1.recordset.length) {
        typeId = res1.recordset[0].id_d_t;
      } else {
        const ins1 = transaction.request();
        ins1.input('typeName', sql.NVarChar(100), (typeName as string).trim());
        const out1 = await ins1.query(`
          INSERT INTO dbo.T_devc_type(dv_type)
          OUTPUT INSERTED.id_d_t
          VALUES(@typeName)
        `);
        typeId = out1.recordset[0].id_d_t;
      }

      // --- upsert division ---
      const tr2 = transaction.request();
      tr2.input('divName', sql.NVarChar(100), (divisionName as string).trim());
      let res2 = await tr2.query(`
        SELECT id1 FROM dbo.T_division
         WHERE division = @divName
      `);
      let divisionId: number;
      if (res2.recordset.length) {
        divisionId = res2.recordset[0].id1;
      } else {
        const ins2 = transaction.request();
        ins2.input('divName', sql.NVarChar(100), (divisionName as string).trim());
        const out2 = await ins2.query(`
          INSERT INTO dbo.T_division(division)
          OUTPUT INSERTED.id1
          VALUES(@divName)
        `);
        divisionId = out2.recordset[0].id1;
      }

      // --- upsert department ---
      const tr3 = transaction.request();
      tr3.input('deptName', sql.NVarChar(100), (departmentName as string).trim());
      tr3.input('divisionId', sql.Int, divisionId);
      let res3 = await tr3.query(`
        SELECT id2 FROM dbo.T_department
         WHERE department = @deptName AND id2= @divisionId
      `);
      let departmentId: number;
      if (res3.recordset.length) {
        departmentId = res3.recordset[0].id2;
      } else {
        const ins3 = transaction.request();
        ins3.input('deptName', sql.NVarChar(100), (departmentName as string).trim());
        ins3.input('divisionId', sql.Int, divisionId);
        const out3 = await ins3.query(`
          INSERT INTO dbo.T_department(department, id1)
          OUTPUT INSERTED.id2
          VALUES(@deptName, @divisionId)
        `);
        departmentId = out3.recordset[0].id2;
      }

      // --- upsert section ---
      const tr4 = transaction.request();
      tr4.input('sectName', sql.NVarChar(100), (sectionName as string).trim());
      tr4.input('departmentId', sql.Int, departmentId);
      let res4 = await tr4.query(`
        SELECT id3 FROM dbo.T_section
         WHERE section = @sectName AND id2 = @departmentId
      `);
      let sectionId: number;
      if (res4.recordset.length) {
        sectionId = res4.recordset[0].id3;
      } else {
        const ins4 = transaction.request();
        ins4.input('sectName', sql.NVarChar(100), (sectionName as string).trim());
        ins4.input('divisionId', sql.Int, divisionId);

        ins4.input('departmentId', sql.Int, departmentId);
        const out4 = await ins4.query(`
          INSERT INTO dbo.T_section(section, id1,id2)
          OUTPUT INSERTED.id3
          VALUES(@sectName,@divisionId, @departmentId)
        `);
        sectionId = out4.recordset[0].id3;
      }

      // --- upsert description ---
      const tr5 = transaction.request();
      tr5.input('typeDv', sql.Int, typeId);
      tr5.input('descName', sql.NVarChar(100), (descName as string).trim());
      let res5 = await tr5.query(`
        SELECT id_descript FROM dbo.T_description_dv
         WHERE type_dv = @typeDv AND description_dv = @descName
      `);
      let descriptionId: number;
      if (res5.recordset.length) {
        descriptionId = res5.recordset[0].id_descript;
      } else {
        const ins5 = transaction.request();
        ins5.input('typeDv', sql.Int, typeId);
        ins5.input('descName', sql.NVarChar(100), (descName as string).trim());
        const out5 = await ins5.query(`
          INSERT INTO dbo.T_description_dv(type_dv, description_dv)
          OUTPUT INSERTED.id_descript
          VALUES(@typeDv, @descName)
        `);
        descriptionId = out5.recordset[0].id_descript;
      }
  // --- existence check: skip if noDv already in T_dvises ---
      const trCheck = transaction.request();
      trCheck.input('noDv', sql.BigInt, BigInt(noDv as number));
      const existRes = await trCheck.query(`
        SELECT 1 AS already  
        FROM dbo.T_dvises 
        WHERE no_dv = @noDv
      `);
7
      const tr6 = transaction.request();
      
      tr6.input('typeDv', sql.Int, typeId);
      tr6.input('noDv', sql.BigInt, BigInt(noDv as number));
      tr6.input('divisionId', sql.Int, divisionId);
      tr6.input('departmentId', sql.Int, departmentId);
      tr6.input('sectionId', sql.Int, sectionId);
      tr6.input('desc2', sql.Int, descriptionId);
      tr6.input('caseDv', sql.NVarChar(50), (caseStatus as string));
      tr6.input('cpu',  sql.NVarChar(10), cpu || null);
      tr6.input('ram',  sql.NVarChar(10), ram || null);
      tr6.input('hard', sql.NVarChar(10), hard || null);
      tr6.input('vga',  sql.NVarChar(10), vga || null);
      tr6.input('notes', sql.NVarChar(sql.MAX), notes || null);

      await tr6.query(`
        INSERT INTO dbo.T_dvises
          (type_dv, no_dv, locat_dv_1, locat_dv_2, locat_dv_3,
           description_dv2, case_dv, cpu, ram, hard, vga, notes)
        VALUES
          (@typeDv, @noDv, @divisionId, @departmentId, @sectionId,
           @desc2, @caseDv, @cpu, @ram, @hard, @vga, @notes)
      `);
    }

    await transaction.commit();
    return NextResponse.json({ success: true });
  } catch (e) {
    if (transaction) await transaction.rollback();
    console.error('Import devices error:', e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
