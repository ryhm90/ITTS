// src/app/api/requests/[id]/print-apology/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import jwt from 'jsonwebtoken';
import sql from 'mssql';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import fs from 'fs';
import path from 'path';
export const dynamic = 'force-dynamic';

// نستورد السلسلة Base64 الخاصة بخط Amiri من ملف public/fonts/Amiri-Regular-normal.js
import { font as amiriFontBase64 } from '../../../../../../public/fonts/Amiri-Regular-normal';

// ----------------------------------------------------------------------------
// 1) دالة مساعدة لجلب بيانات الطلب 
// ----------------------------------------------------------------------------
async function getRequestById(id: number, requesterId: number) {
  const db = await getConnection();
  const ps = db
    .request()
    .input('id', sql.Int, id)
    .input('requesterId', sql.Int, requesterId);

  const { recordset } = await ps.query(`
    SELECT
      r.RequestID           AS RequestID,
      r.Title               AS Title,
      r.Description         AS Description,
      r.Status              AS Status,
      r.RequestDate         AS RequestDate,
      r.DivisionName        AS DivisionName,
      r.DepartmentName      AS DepartmentName,
      r.SectionName         AS SectionName,
      r.service             AS Service,
      r.memoID              AS memoID,
      r.memoDate            AS memoDate,
      d.id_dvises           AS deviceId,
      d.type_dv             AS deviceType,
      d.no_dv               AS deviceNo,
      d.description_dv2     AS descp_id,
      tdv.description_dv    AS deviceDesc
    FROM dbo.Requests AS r
    LEFT JOIN dbo.T_dvises AS d
      ON r.DeviceId = d.id_dvises
    LEFT JOIN dbo.T_description_dv AS tdv
      ON d.description_dv2 = tdv.id_descript
    WHERE r.RequestID   = @id
      AND r.RequesterID = @requesterId
  `);

  if (!recordset || recordset.length === 0) {
    return null;
  }

  const row = recordset[0];
  const deviceName =
    row.deviceType && row.deviceNo
      ? `${row.deviceType} #${row.deviceNo}${row.deviceDesc ? ' – ' + row.deviceDesc : ''}`
      : 'غير محدد';

  return {
    RequestID:      row.RequestID,
    Title:          row.Title,
    Description:    row.Description,
    Status:         row.Status,
    RequestDate:    row.RequestDate,
    DivisionName:   row.DivisionName,
    DepartmentName: row.DepartmentName,
    SectionName:    row.SectionName,
    memoID:         row.memoID,
    Service:        row.Service,
    memoDate:       row.memoDate.toISOString().slice(0, 10),
    deviceName,
  };
}

// ----------------------------------------------------------------------------
// 2) دالة مساعدة لجلب تاريخ حدث "اعتذار"
// ----------------------------------------------------------------------------
async function getApologyActionDate(id: number) {
  const db = await getConnection();
  const ps = db.request().input('id', sql.Int, id);

  const { recordset } = await ps.query(`
    SELECT TOP 1 ActionDate
    FROM dbo.RequestHistory
    WHERE RequestID = @id
      AND ActionType = N'اعتذار'
    ORDER BY ActionDate DESC
  `);

  if (!recordset || recordset.length === 0) {
    return null;
  }
  return recordset[0].ActionDate as Date;
}

// ----------------------------------------------------------------------------
// 3) دالة مساعدة لتوليد Buffer من jsPDF
// ----------------------------------------------------------------------------
async function generatePdfBufferWithJsPDF(reqData: any, apologyDateISO: string) {
  // 3.1) إنشاء document جديد
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
  });

  // 3.2) إضافة خطّ Amiri
  doc.addFileToVFS('Amiri-Regular.ttf', amiriFontBase64);
  doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
  doc.setFont('Amiri', 'normal');

  // هوامش العرض
  const leftMargin = 15;
  const rightMargin = 15;
  const pageWidth = 210;

  // 3.3) إعداد صورة الشعار (logo.png) بصيغة Base64
  let logoBase64 = '';
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    const imageData = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${imageData.toString('base64')}`;
  } catch {
    // إذا لم نجده، نبقي logoBase64 فارغة
    logoBase64 = '';
  }

  // 3.4) رسم الشعار (إذا كان متوفرًا) في منتصف أفق الصفحة عند y = 20mm
  const headerY = 20;
  if (logoBase64) {
    const logoWidth = 30;
    const xCenter = (pageWidth - logoWidth) / 2;
    doc.addImage(logoBase64, 'PNG', xCenter, headerY - 10, logoWidth, 0);
  }

  // 3.5) كتابة عنوان الوزارة والجهة على يسار الصفحة في نفس المستوى الرأسي
  doc
    .setFontSize(20)
    .text('Ministry Of Oil', leftMargin + 25, headerY, { align: 'center' });
  doc
    .setFontSize(14)
    .text('S.C.G.F.S', leftMargin + 25, headerY + 8, {
      align: 'center',
    });
  doc
    .setFontSize(14)
    .text('Department of Information and', leftMargin + 25, headerY + 16, {
      align: 'center',
    });
doc
    .setFontSize(14)
    .text('Communication Technology', leftMargin + 25, headerY + 24, {
      align: 'center',
    });
doc
    .setFontSize(20)
    .text('وزارة النفط', pageWidth - rightMargin - 25, headerY, { align: 'center' });
  doc
    .setFontSize(14)
    .text('الشركة العامة لتعبئة وخدمات الغاز', pageWidth - rightMargin - 25, headerY + 8, {
      align: 'center',
    });
  doc
    .setFontSize(14)
    .text('قسم تقنية المعلومات والاتصالات', pageWidth - rightMargin - 25, headerY + 16, {
      align: 'center',
    });



  // 3.7) رسم خط فاصل أسفل الهيدر
  const afterHeaderY = headerY + 34;
  doc.setLineWidth(0.5).line(leftMargin, afterHeaderY, pageWidth - rightMargin, afterHeaderY);

  doc
    .setFontSize(14)
    .text(`التاريخ: ${apologyDateISO}`, leftMargin + 25, afterHeaderY + 8, {
      align: 'center',
    });
  // نبدأ الكتابة أسفل الهيدر
  let currentY = afterHeaderY + 18;

  // 3.8) عنوان "م / اعتذار" في منتصف الصفحة
  doc.setFontSize(16).text('م / اعتذار', pageWidth / 2, currentY, { align: 'center' });
  currentY += 12;

  // 3.9) "إلى" في الجهة اليمنى
  doc
    .setFontSize(12)
    .text(
      `إلى: ${reqData.DivisionName} / ${reqData.DepartmentName}`,
      pageWidth - rightMargin,
      currentY,
      { align: 'right' }
    );
  currentY += 12;

  // 3.10) جدول بيانات الطلب يدويًا
  const rowHeight = 8;
  const valueX = pageWidth - rightMargin - 45;

  // كل صف:
  // رقم الطلب
  doc
    .text('رقم الطلب', pageWidth - rightMargin - 15, currentY,
      { align: 'right' })
    .text(`${reqData.RequestID}`, valueX, currentY,
      { align: 'right' });
  currentY += rowHeight;

  // الموضوع
  doc
    .text('الموضوع', pageWidth - rightMargin - 15, currentY,
      { align: 'right' })
    .text(`${reqData.Title}`, valueX, currentY,
      { align: 'right' });
  currentY += rowHeight;

  // الوصف
  doc.text('الوصف', pageWidth - rightMargin - 15, currentY,
      { align: 'right' });
  doc.text(`${reqData.Description}`, valueX, currentY,
      { align: 'right' }, {
    maxWidth: pageWidth - pageWidth - rightMargin - 15 - valueX,
  });
  currentY += rowHeight;

  // الخدمة المطلوبة
  doc
    .text('الخدمة المطلوبة', pageWidth - rightMargin - 15, currentY,
      { align: 'right' })
    .text(`${reqData.Service}`, valueX, currentY,
      { align: 'right' });
  currentY += rowHeight;

  // الجهاز/النظام
  doc
    .text('الجهاز/النظام', pageWidth - rightMargin - 15, currentY,
      { align: 'right' })
    .text(`${reqData.deviceName}`, valueX, currentY,
      { align: 'right' });
  currentY += rowHeight;

  // تاريخ التقديم
  const reqDateISO = new Date(reqData.RequestDate).toISOString().slice(0, 10);
  doc
    .text('تاريخ التقديم', pageWidth - rightMargin - 15, currentY,
      { align: 'right' })
    .text(`${reqDateISO}`, valueX, currentY,
      { align: 'right' });
  currentY += rowHeight * 2;

  // 3.11) فقرة نصّ الاعتذار (نص عربي طويل) مع خاصية الـ RTL
  const apologyText =
    `تحيّة طيبة وبعد\n\n` +
    `نودّ أن نعلمكم بأننا تلقّينا طلبكم أعلاه المقدم بقسمنا بالمذكرة المرقمة ${reqData.memoID} والمؤرخة في ${reqData.memoDate}، ` +
    `ولكننا نأسف لإبلاغكم بأننا لا نستطيع تلبية هذا الطلب في الوقت الحالي. ` +
    `وإنّنا نعتذر عن أي إزعاج قد ينتج عن ذلك. نسعى جاهدين لتوفير أفضل الخدمات، ونرجو أن تتفهموا الظروف الحالية.\n\n` +
    `سنحرص على التواصل معكم فور استقرار الوضع وتمكّننا من تنفيذ الطلب. شاكرين حسن تعاونكم.\n`;

  doc.setFontSize(14);
  // نستخدم cast إلى any لتجاوز تحذير TypeScript بأن الخاصية 'rtl' غير معروفة
  doc.text(
    apologyText,
    pageWidth - rightMargin,
    currentY ,
    {
      maxWidth: pageWidth,
      align: 'right',
      rtl: true,
      lineHeightFactor: 1.5,
    } as any
  );

  // تحديث currentY بناءً على عدد الأسطر
  const lineHeight = doc.getLineHeight();
  currentY += (apologyText.split('\n').length + 1) * lineHeight;

 doc
    .text('محمد سعد مرضي', leftMargin + 45, currentY - 18, {
      align: 'center',
    });
  doc
    .text('مدير قسم تقنية المعلومات والاتصالات', leftMargin + 45, currentY - 10, {
      align: 'center',
    });
  currentY += rowHeight;

  currentY += rowHeight;

  currentY += rowHeight * 2;

  // 3.13) التذييل البسيط في أسفل الصفحة
  doc
    .setFontSize(10)
    .text('جهة الاتصال: info@yourdomain.com', leftMargin, 285, {
      align: 'left',
    })
    .text('الصفحة 1 من 1', pageWidth - rightMargin, 285, {
      align: 'right',
    });

  // 3.14) إنتاج الـ PDF كـ ArrayBuffer ثم تحويله إلى Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

// ----------------------------------------------------------------------------
// 4) نقطة الدخول (GET) للـ API
// ----------------------------------------------------------------------------
export async function GET(req: NextRequest, context: any) {
  try {
    // 4.1) التحقق من التوكن وصلاحية المستخدم
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = payload.id as number;

    // 4.2) التحقق من معرف الطلب
    const awaitedParams = await context.params;
    const idParam = awaitedParams.id;              // مثال: "76"
    const id = Number(idParam);
    if (isNaN(id)) {
      return new NextResponse('معرّف الطلب غير صالح', { status: 400 });
    }

    // 4.3) جلب بيانات الطلب
    const reqData = await getRequestById(id, userId);
    if (!reqData) {
      return new NextResponse('الطلب غير موجود أو لا تملك صلاحية الوصول إليه', { status: 404 });
    }

    // 4.4) التحقق من حالة الطلب ("اعتذار")
    if (reqData.Status !== 'اعتذار') {
      return new NextResponse('حالة الطلب ليست "اعتذار". لا يمكن إنشاء PDF.', { status: 400 });
    }

    // 4.5) جلب تاريخ حدث "اعتذار"
    const apologyDateObj = await getApologyActionDate(id);
    if (!apologyDateObj) {
      return new NextResponse('لا يوجد سجل اعتذار لهذا الطلب.', { status: 400 });
    }
    const apologyDateISO = apologyDateObj.toISOString().slice(0, 10);

    // 4.6) توليد الـ Buffer الخاص بالـ PDF
    const pdfBuffer = await generatePdfBufferWithJsPDF(reqData, apologyDateISO);

    // 4.7) إعادة ملف PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="apology_request_${reqData.RequestID}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/requests/[id]/print-apology:', err);
    return NextResponse.json({ error: 'فشل في طباعة الاعتذار' }, { status: 500 });
  }
}
