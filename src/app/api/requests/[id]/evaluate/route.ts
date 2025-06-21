// src/app/api/requests/[id]/evaluate/route.ts
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  // 1) مصادقة بتوفر التوكن وفحصه
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  if (payload.role !== 'جهة مستفيدة') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2) استخراج الـ id من مسار الطلب
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  // المسار المتوقَّع: ["api","requests","{id}","evaluate"]
  const rawId = segments[2];
  const requestId = parseInt(rawId, 10);
  if (isNaN(requestId)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  // 3) قراءة الـ JSON من الجسم والتحقّق من الدرجات
  let body: {
    accuracy?: number;
    speed?: number;
    behavior?: number;
    comments?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { accuracy, speed, behavior, comments } = body;
  if (
    typeof accuracy !== 'number' ||
    typeof speed !== 'number' ||
    typeof behavior !== 'number' ||
    ![accuracy, speed, behavior].every(n => Number.isInteger(n) && n >= 0 && n <= 5)
  ) {
    return NextResponse.json({
      error: 'Each rating must be an integer between 0 and 5.'
    }, { status: 400 });
  }
  const safeComments = typeof comments === 'string' ? comments.trim() : '';

  // 4) تحضير اسم المقيّم (actor)
  const actorName = 
    `${payload.role} - ${payload.department.name} - ${payload.fullName || payload.name}`;

  // 5) خريطة النصوص العربية للدرجات
  const ratingLabels: Record<number,string> = {
    5: 'ممتاز',
    4: 'جيد جداً',
    3: 'جيد',
    2: 'متوسط',
    1: 'مقبول',
    0: 'ضعيف',
  };

  // 6) فتح الاتصال وقفل المعاملة (transaction)
  let pool: sql.ConnectionPool;
  try {
    pool = await getConnection();
  } catch (err) {
    console.error('Database connection error:', err);
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();

    // (أ) تحديث حالة الطلب إلى "مكتمل"
    const req1 = tx.request();
    req1.input('rid', sql.Int, requestId);
    await req1.query(`
      UPDATE dbo.Requests
      SET Status = N'مكتمل'
      WHERE RequestID = @rid;
    `);

    // (ب) تسجيل التقييم في سجل العمليات
    const note = 
      `دقة: ${ratingLabels[accuracy]}، سرعة: ${ratingLabels[speed]}، سلوك: ${ratingLabels[behavior]}` +
      (safeComments ? `، ملاحظات: ${safeComments}` : '');
    const req2 = tx.request();
    req2
      .input('rid', sql.Int, requestId)
      .input('actionBy', sql.NVarChar(200), actorName)
      .input('actionType', sql.NVarChar(100), 'تقييم الإنجاز')
      .input('actionNote', sql.NVarChar(sql.MAX), note);
    await req2.query(`
      INSERT INTO dbo.RequestHistory
        (RequestID, ActionBy, ActionType, ActionNote)
      VALUES
        (@rid, @actionBy, @actionType, @actionNote);
    `);

    // (ج) حفظ صف التقييم في جدول التقييمات
    const req3 = tx.request();
    req3
      .input('requestId', sql.Int, requestId)
      .input('accuracy', sql.Int, accuracy)
      .input('speed', sql.Int, speed)
      .input('behavior', sql.Int, behavior)
      .input('comments', sql.NVarChar(sql.MAX), safeComments || null);
    await req3.query(`
      INSERT INTO dbo.T_evaluations
        (request_id, accuracy, speed, behavior, comments)
      VALUES
        (@requestId, @accuracy, @speed, @behavior, @comments);
    `);

    // 7) إنهاء المعاملة بنجاح
    await tx.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    // 8) عند الخطأ: تراجع عن المعاملة وإرجاع 500
    await tx.rollback().catch(() => {});
    console.error('Evaluate error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
