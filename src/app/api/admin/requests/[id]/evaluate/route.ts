// src/app/api/admin/requests/[requestId]/evaluate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
import jwt from 'jsonwebtoken';
export const dynamic = 'force-dynamic';

//
// POST /api/admin/requests/[requestId]/evaluate
//
// Body: { accuracy: number, speed: number, behavior: number, comments?: string }
// - يُحدّث حالة الطلب إلى "مكتمل"
// - يُدرج تقييمًا في جدول T_evaluations
// - يُدرج سجلًا في RequestHistory يتضمن معلومات التقييم
//

export async function POST(request: NextRequest) {
  // 1) استخرج الـ id من مسار الطلب
  const url = new URL(request.url);
  // مثال: /api/admin/requests/123/evaluate
  const segments = url.pathname.split('/');
  // 'requests' عند index 3، و id عند index 4
  const rawId = segments[4]!;
  const requestId = parseInt(rawId, 10);
  if (isNaN(requestId)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }  // 1) مصادقة وتفويض
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

  // إذا كان دور المستخدم هو "الجهة المستفيدة" فلا يسمح له بالإجراء
  if (payload.role === 'جهة مستفيدة') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (isNaN(requestId)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  // 2) قارئ JSON والتحقق من الحقول
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
    ![accuracy, speed, behavior].every(n => Number.isInteger(n) && n >= 1 && n <= 5)
  ) {
    return NextResponse.json(
      {
        error:
          'Each rating (accuracy, speed, behavior) must be an integer between 1 and 5.',
      },
      { status: 400 }
    );
  }

  // التأكد من أن التعليق نصّ (يمكن أن يكون فارغاً)
  const safeComments = typeof comments === 'string' ? comments.trim() : '';

  // جهّز اسم المُنفّذ (actor) من حمولة الـ JWT
    const actorName = `${payload.role} - ${payload.department.name} - ${payload.fullName || payload.name}`;

  // 3) افتح ترانزاكشن مع قاعدة البيانات
  let pool: sql.ConnectionPool;
  try {
    pool = await getConnection();
  } catch (err) {
    console.error('Database connection error:', err);
    return NextResponse.json(
      { error: 'Failed to connect to the database.' },
      { status: 500 }
    );
  }

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    // 4) حدّث حالة الطلب إلى "مكتمل"
    const txReq1 = transaction.request();
    txReq1.input('rid', sql.Int, requestId);
    await txReq1.query(`
      UPDATE dbo.Requests
      SET Status = N'مكتمل'
      WHERE RequestID = @rid;
    `);

    // 5) أدرج سجل التقييم في RequestHistory، مع تضمين تفاصيل التقييم في الحقل ActionNote
    const txReqHist = transaction.request();
    const noteText = `دقة: ${accuracy}، سرعة: ${speed}، سلوك: ${behavior}` +
      (safeComments ? `، ملاحظات: ${safeComments}` : '');

    txReqHist
      .input('rid', sql.Int, requestId)
      .input('actionBy', sql.NVarChar(200), actorName)
      .input('actionType', sql.NVarChar(100), 'تقييم الإنجاز')
      .input('actionNote', sql.NVarChar(sql.MAX), noteText);
    await txReqHist.query(`
      INSERT INTO dbo.RequestHistory
        (RequestID, ActionBy, ActionType, ActionNote)
      VALUES
        (@rid, @actionBy, @actionType, @actionNote);
    `);

    // 6) أدرج صفًّا في جدول T_evaluations
    // أرجِّع الـ requestId كـ INT فقط للتأكد
    const txReqEval = transaction.request();
    txReqEval.input('requestId', sql.Int, requestId);
    txReqEval.input('accuracy', sql.Int, accuracy);
    txReqEval.input('speed', sql.Int, speed);
    txReqEval.input('behavior', sql.Int, behavior);
    txReqEval.input('comments', sql.NVarChar(sql.MAX), safeComments || null);

    await txReqEval.query(`
      INSERT INTO dbo.T_evaluations
        (request_id, accuracy, speed, behavior, comments)
      VALUES
        (@requestId, @accuracy, @speed, @behavior, @comments);
    `);

    // 7) أتمّم الترانزاكشن
    await transaction.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    // في حال الخطأ نرجع الترانزاكشن
    try {
      await transaction.rollback();
    } catch (_) {}
    console.error('Evaluate request error:', err);
    return NextResponse.json({ error: 'Database error.' }, { status: 500 });
  }
}
