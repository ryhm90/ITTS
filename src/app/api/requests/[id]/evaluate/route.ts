// src/app/api/requests/[id]/evaluate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
import jwt from 'jsonwebtoken';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
 req: NextRequest,
  context: any 
) {
  // طباعة بيانات المسار لغرض التصحيح

  // 1) مصادقة وتفويض
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

  // منع دور "الجهة المستفيدة" من الوصول
  if (payload.role === 'جهة مستفيدة') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2) الحصول على معرِّف الطلب من params.id
  const rawId = context.params.id;
  const requestId = parseInt(rawId, 10);
  if (isNaN(requestId)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  // 3) قراءة البيانات الواردة من العميل وتحقُّقها
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
  // تحقق بسيط: يجب أن تكون الدرجات أعدادًا صحيحة بين 1 و 5
  if (
    typeof accuracy !== 'number' ||
    typeof speed !== 'number' ||
    typeof behavior !== 'number' ||
    ![accuracy, speed, behavior].every((n) => Number.isInteger(n) && n >= 0 && n <= 5)
  ) {
    return NextResponse.json(
      {
        error:
          'Each rating (accuracy, speed, behavior) must be an integer between 0 and 5.',
      },
      { status: 400 }
    );
  }

  // التعليقات قد تكون فارغة أو غير موجودة
  const safeComments = typeof comments === 'string' ? comments.trim() : '';

  // 4) جهِّز اسم المقيِّم (Actor) من payload
  const actorName = `${payload.role} - ${payload.department.name} - ${payload.fullName || payload.name}`;

  // 5) خريطة التحويل من الرقم إلى النصّ العربي
  const ratingLabels: Record<number, string> = {
    5: 'ممتاز',
    4: 'جيد جداً',
    3: 'جيد',
    2: 'متوسط',
    1: 'مقبول',
    0: 'ضعيف',
  };

  // 6) افتح اتصالًا بقائمة البيانات وابدأ معاملة (transaction)
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

    // 6.a) حدِّث حالة الطلب في جدول Requests إلى "مكتمل"
    const txReq1 = transaction.request();
    txReq1.input('rid', sql.Int, requestId);
    await txReq1.query(`
      UPDATE dbo.Requests
      SET Status = N'مكتمل'
      WHERE RequestID = @rid;
    `);

    // 6.b) أضف سطرًا في RequestHistory يوضح أنه تم تقييم الإنجاز
    //    – نحول كل قيمة رقمية إلى التسمية العربية المناسبة
    const noteText =
      `دقة: ${ratingLabels[accuracy]}، سرعة: ${ratingLabels[speed]}، سلوك: ${ratingLabels[behavior]}` +
      (safeComments ? `، ملاحظات: ${safeComments}` : '');

    const txReqHist = transaction.request();
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

    // 6.c) أضف صفّ التقييم في جدول T_evaluations
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

    await transaction.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {}
    console.error('Evaluate request error:', err);
    return NextResponse.json({ error: 'Database error.' }, { status: 500 });
  }
}
