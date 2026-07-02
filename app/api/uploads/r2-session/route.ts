import { NextResponse } from 'next/server';
import { getPresignedUploadUrl } from '@/integrations/r2/r2-service';
import { getPool } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assetId, fileName, mimeType, fileSize } = await request.json();

    if (!assetId || !fileName) {
      return NextResponse.json({ error: 'assetId and fileName are required' }, { status: 400 });
    }

    const ext = fileName.split('.').pop() || 'bin';
    const key = `uploads/${user.id}/${assetId}/${randomUUID()}.${ext}`;

    const { uploadUrl, key: r2Key } = await getPresignedUploadUrl({
      key,
      contentType: mimeType || 'application/octet-stream',
      expiresIn: 3600,
    });

    const pool = getPool();
    await pool.query(
      `INSERT INTO upload_sessions (id, asset_id, user_id, r2_key, file_name, mime_type, file_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       ON CONFLICT DO NOTHING`,
      [randomUUID(), assetId, user.id, r2Key, fileName, mimeType || 'application/octet-stream', fileSize || 0]
    );

    return NextResponse.json({ uploadUrl, key: r2Key });
  } catch (error) {
    logProductionRuntimeError('api-uploads-r2-session', error);
    return NextResponse.json({ error: 'Failed to create upload session' }, { status: 500 });
  }
}
