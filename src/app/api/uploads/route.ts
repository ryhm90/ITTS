import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const buffer = Buffer.from(await file.arrayBuffer());

  const uploadPath = path.join(process.cwd(), 'public/uploads', file.name);
  await writeFile(uploadPath, buffer);
  
  return NextResponse.json({ url: `/uploads/${file.name}` });
}
