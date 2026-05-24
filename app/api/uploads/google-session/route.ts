import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAssetDetail } from '@/services/assets-service';
import { canUploadFromStatus, canUploadRevisionFromStatus } from '@/lib/asset-workflow';
import { resolveAssetDriveFolder } from '@/services/assets-service';
import { createDriveResumableUploadSession } from '@/integrations/google-drive/drive-service';

export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 524288000;

interface UploadSessionBody {
  assetId?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}

export async function POST(request: Request) {
  let assetId = 'unknown';
  let clientId = 'unknown';
  let fileName = 'unknown';
  let mimeType = 'application/octet-stream';
  let parentFolderId: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const [userResult, sessionResult] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);
    const user = userResult.data.user;

    if (userResult.error || !user || !sessionResult.data.session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as UploadSessionBody;
    assetId = body.assetId?.trim() ?? 'unknown';
    fileName = body.fileName?.trim() ?? 'unknown';
    mimeType = body.mimeType?.trim() || 'application/octet-stream';
    const fileSize = typeof body.fileSize === 'number' ? body.fileSize : Number(body.fileSize);

    if (!assetId) {
      return NextResponse.json({ success: false, error: 'assetId is required' }, { status: 400 });
    }

    if (!fileName) {
      return NextResponse.json({ success: false, error: 'fileName is required' }, { status: 400 });
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ success: false, error: 'fileSize is required' }, { status: 400 });
    }

    if (fileSize > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ success: false, error: 'Request body exceeded 500mb' }, { status: 413 });
    }

    const asset = await getAssetDetail(assetId);
    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    clientId = asset.clientId;

    const uploadAllowed = canUploadFromStatus(asset.status) || canUploadRevisionFromStatus(asset.status);
    if (!uploadAllowed) {
      return NextResponse.json({ success: false, error: 'Upload not allowed for the current asset state' }, { status: 409 });
    }

    const folder = await resolveAssetDriveFolder(asset.type, asset.clientId);
    if (!folder) {
      return NextResponse.json({ success: false, error: 'Drive folder not found for asset' }, { status: 404 });
    }

    parentFolderId = folder.id;

    const session = await createDriveResumableUploadSession({
      folderId: folder.id,
      fileName,
      mimeType,
      fileSize,
    });

    console.info('[drive-resumable-upload]', {
      assetId,
      uploadSessionCreated: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          uploadUrl: session.uploadUrl,
          driveFileId: session.driveFileId,
          uploadType: 'resumable',
          assetId,
          fileName,
          mimeType,
          fileSize,
        },
        uploadUrl: session.uploadUrl,
        driveFileId: session.driveFileId,
        uploadType: 'resumable',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[google-resumable-session]', {
      step: 'create-session',
      assetId,
      clientId,
      mimeType,
      fileName,
      parentFolderId,
      message: error instanceof Error ? error.message : 'unknown',
      stack: error instanceof Error ? error.stack ?? null : null,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Google resumable upload session',
      },
      { status: 500 }
    );
  }
}