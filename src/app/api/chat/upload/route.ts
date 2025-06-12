import { IncomingForm, Fields, Files } from 'formidable';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// تعطيل body parsing الافتراضي ل Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  const form = new IncomingForm({
    multiples: false,
    keepExtensions: true,
  });

  const data = await new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
    form.parse(req as any, (err: any, fields: Fields, files: Files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

  const file = data.files.file?.[0] || data.files.file;

  if (!file) {
    return NextResponse.json({ error: 'لم يتم تحميل أي ملف' }, { status: 400 });
  }

  const { filepath, mimetype, originalFilename } = file as {
    filepath: string;
    mimetype: string;
    originalFilename: string;
  };

  const allowedTypes = ['image/jpeg', 'image/png'];
  if (!allowedTypes.includes(mimetype)) {
    return NextResponse.json({ error: 'نوع الملف غير مسموح' }, { status: 400 });
  }

  const extension = path.extname(originalFilename || '') || '.jpg';
  const fileName = `${uuidv4()}${extension}`;
  const filePath = path.join(process.cwd(), 'public/uploads', fileName);

  const fileData = await fetch(`file://${filepath}`);
  const buffer = Buffer.from(await fileData.arrayBuffer());

  await writeFile(filePath, buffer);

  return NextResponse.json({ url: `/uploads/${fileName}` });
}
