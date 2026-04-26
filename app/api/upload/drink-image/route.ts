import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const drinkName = formData.get('drinkName') as string;

    if (!file || !drinkName) {
      return NextResponse.json({ error: 'Missing file or drinkName' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const slug = drinkName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const ext = path.extname(file.name).toLowerCase() || '.png';
    const filename = `${slug}${ext}`;

    const uploadDir = path.join(process.cwd(), 'public', 'images', 'drinks');
    await mkdir(uploadDir, { recursive: true });

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const imageUrl = `/images/drinks/${filename}`;
    return NextResponse.json({ imageUrl, filename }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Upload error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
