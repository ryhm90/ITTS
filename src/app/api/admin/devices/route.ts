import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const {
    typeId,
    noDv,
    descriptionName,
    caseStatus,
    divisionId,
    departmentId,
    sectionId,
    // إذا تريد تضمين مواصفات الحاسوب:
    cpu,
    ram,
    hard,
    vga,
    notes
  } = await req.json();

  const pool = await getConnection();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1) تأكد من وجود الوصف أو أضفه
    const trxReq1 = transaction.request();
    trxReq1.input('typeDv', sql.Int, typeId);
    trxReq1.input('descName', sql.NVarChar(100), descriptionName.trim());
    const descRes = await trxReq1.query(`
      SELECT id_descript 
      FROM dbo.T_description_dv
      WHERE type_dv = @typeDv AND description_dv = @descName
    `);

    let descriptionId: number;
    if (descRes.recordset.length > 0) {
      descriptionId = descRes.recordset[0].id_descript;
    } else {
      // إدراج وصف جديد
      const insReq = transaction.request();
      insReq.input('typeDv', sql.Int, typeId);
      insReq.input('descName', sql.NVarChar(100), descriptionName.trim());
      const insRes = await insReq.query(`
        INSERT INTO dbo.T_description_dv(type_dv, description_dv)
        OUTPUT INSERTED.id_descript
        VALUES(@typeDv, @descName)
      `);
      descriptionId = insRes.recordset[0].id_descript;
    }

    // 2) إدراج الجهاز في الجدول الرئيسي
    const trxReq2 = transaction.request();
    trxReq2.input('typeDv',      sql.Int,     typeId);
    trxReq2.input('noDv',        sql.BigInt,  noDv);
    trxReq2.input('divisionId',  sql.Int,     divisionId);
    trxReq2.input('departmentId',sql.Int,     departmentId);
    trxReq2.input('sectionId',   sql.Int,     sectionId);
    trxReq2.input('desc2',       sql.Int,     descriptionId);
    trxReq2.input('caseDv',      sql.NVarChar(50), caseStatus);
      trxReq2.input('cpu',   sql.NVarChar(10), cpu);
      trxReq2.input('ram',   sql.NVarChar(10), ram);
      trxReq2.input('hard',  sql.NVarChar(10), hard);
      trxReq2.input('vga',   sql.NVarChar(10), vga);
      trxReq2.input('notes', sql.NVarChar(sql.MAX), notes);
    await trxReq2.query(`
      INSERT INTO dbo.T_dvises
        (type_dv, no_dv, locat_dv_1, locat_dv_2, locat_dv_3, description_dv2,case_dv,cpu,
            ram,
            hard,
            vga,
            notes)
      VALUES
        (@typeDv, @noDv, @divisionId, @departmentId, @sectionId, @desc2, @caseDv,@cpu,@ram,@hard,@vga,@notes)
    `);

    await transaction.commit();
    return NextResponse.json({ success: true });
  } catch (e) {
    await transaction.rollback();
    console.error('Add device error:', e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
