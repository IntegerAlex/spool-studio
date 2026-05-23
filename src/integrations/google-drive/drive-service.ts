import type { drive_v3 } from 'googleapis';
import { Readable } from 'node:stream';
import { authenticateDrive } from './drive-client';
import type {
  DriveFolderAccessDiagnostics,
  DriveFolderInput,
  DriveFolderResult,
} from './types';

type DriveFolderMetadata = {
  id: string;
  name: string;
  parents: string[] | null;
  driveId: string | null;
  owners: Array<{ emailAddress?: string | null; displayName?: string | null }>;
  permissions: Array<{
    emailAddress?: string | null;
    role?: string | null;
    type?: string | null;
    deleted?: boolean | null;
  }>;
  webViewLink: string | null;
};

type DriveUploadMetadata = {
  id: string;
  name: string;
  parents: string[] | null;
  driveId: string | null;
  owners: Array<{ emailAddress?: string | null; displayName?: string | null }>;
  permissions: Array<{
    emailAddress?: string | null;
    role?: string | null;
    type?: string | null;
    deleted?: boolean | null;
  }>;
  webViewLink: string | null;
  mimeType: string | null;
  size: number | null;
  thumbnailLink: string | null;
};

export interface DriveUploadInput {
  folderId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  file: File;
}

export interface DriveUploadResult {
  driveFileId: string;
  driveFileUrl: string;
  mimeType: string;
  fileSize: number;
  uploadStatus: 'uploaded';
  thumbnailLink: string | null;
  parents: string[];
  driveId: string | null;
  owners: DriveUploadMetadata['owners'];
  permissions: DriveUploadMetadata['permissions'];
  webViewLink: string;
}

function getGoogleErrorDetails(error: unknown) {
  const maybe = error as {
    message?: string;
    code?: number;
    status?: number;
    response?: { status?: number; data?: unknown };
    errors?: unknown;
  };

  return {
    message: maybe?.message ?? 'Unknown Google Drive error',
    code: maybe?.code ?? maybe?.status ?? maybe?.response?.status ?? null,
    response: maybe?.response?.data ?? maybe?.errors ?? null,
  };
}

function logUploadFailure(stage: string, error: unknown, extra: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : 'Unknown upload error';
  const stack = error instanceof Error ? error.stack ?? null : null;

  console.error('[upload][failure]', {
    stage,
    message,
    stack,
    ...extra,
  });
}

function toFolderResult(file: drive_v3.Schema$File): DriveFolderResult {
  const id = file.id;
  const webViewLink = file.webViewLink;

  if (!id) {
    throw new Error('Google Drive folder response is missing an id');
  }

  if (!webViewLink) {
    throw new Error('Google Drive folder response is missing a webViewLink');
  }

  return {
    id,
    name: file.name ?? '',
    url: webViewLink,
    webViewLink,
    thumbnailLink: file.thumbnailLink ?? null,
    mimeType: file.mimeType ?? 'application/vnd.google-apps.folder',
  };
}

async function fetchFolderMetadata(folderId: string) {
  const drive = await authenticateDrive();

  const response = await drive.files.get({
    fileId: folderId,
    fields: 'id,name,parents,driveId,owners(emailAddress,displayName),permissions(emailAddress,role,type,deleted),webViewLink',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  const file = response.data;
  if (!file.id || !file.name) {
    throw new Error('Google Drive folder metadata response is missing required fields');
  }

  return {
    id: file.id,
    name: file.name,
    parents: file.parents ?? null,
    driveId: file.driveId ?? null,
    owners: (file.owners ?? []).map((owner) => ({
      emailAddress: owner.emailAddress ?? null,
      displayName: owner.displayName ?? null,
    })),
    permissions: (file.permissions ?? []).map((permission) => ({
      emailAddress: permission.emailAddress ?? null,
      role: permission.role ?? null,
      type: permission.type ?? null,
      deleted: permission.deleted ?? null,
    })),
    webViewLink: file.webViewLink ?? null,
  } satisfies DriveFolderMetadata;
}

async function fetchDriveUploadMetadata(fileId: string) {
  const drive = await authenticateDrive();

  const response = await drive.files.get({
    fileId,
    fields:
      'id,name,parents,driveId,owners(emailAddress,displayName),permissions(emailAddress,role,type,deleted),webViewLink,mimeType,size,thumbnailLink',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  const file = response.data;
  if (!file.id || !file.name) {
    throw new Error('Google Drive upload metadata response is missing required fields');
  }

  return {
    id: file.id,
    name: file.name,
    parents: file.parents ?? null,
    driveId: file.driveId ?? null,
    owners: (file.owners ?? []).map((owner) => ({
      emailAddress: owner.emailAddress ?? null,
      displayName: owner.displayName ?? null,
    })),
    permissions: (file.permissions ?? []).map((permission) => ({
      emailAddress: permission.emailAddress ?? null,
      role: permission.role ?? null,
      type: permission.type ?? null,
      deleted: permission.deleted ?? null,
    })),
    webViewLink: file.webViewLink ?? null,
    mimeType: file.mimeType ?? null,
    size: file.size !== undefined && file.size !== null ? Number(file.size) : null,
    thumbnailLink: file.thumbnailLink ?? null,
  } satisfies DriveUploadMetadata;
}

export async function createFolder(input: DriveFolderInput): Promise<DriveFolderResult> {
  const drive = await authenticateDrive();

  try {
    console.info('[google-drive][folder:create] creating folder', {
      folderName: input.name,
      parentFolderId: input.parentFolderId ?? null,
    });

    if (input.parentFolderId) {
      console.info('[google-drive][parent]', {
        folderName: input.name,
        intendedParentFolderId: input.parentFolderId,
      });
    }

    console.info('[google-drive][shared-drive]', {
      folderName: input.name,
      parentFolderId: input.parentFolderId ?? null,
      supportsAllDrives: true,
    });

    const response = await drive.files.create({
      requestBody: {
        name: input.name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: input.parentFolderId ? [input.parentFolderId] : undefined,
      },
      fields: 'id,name,webViewLink,thumbnailLink,mimeType',
      supportsAllDrives: true,
    });

    if (!response.data) {
      throw new Error('Google Drive folder creation returned no data');
    }

    const folder = toFolderResult(response.data);

    const metadata = await fetchFolderMetadata(folder.id);
    const actualParents = metadata.parents ?? [];
    const intendedParentFolderId = input.parentFolderId ?? null;
    const parentMatch = intendedParentFolderId ? actualParents.includes(intendedParentFolderId) : null;

    console.info('[google-drive][created-folder-metadata]', {
      folderName: folder.name,
      folderId: folder.id,
      actualParents,
      driveId: metadata.driveId,
      owners: metadata.owners,
      permissions: metadata.permissions,
      webViewLink: metadata.webViewLink,
    });

    console.info('[google-drive][folder-parent-check]', {
      folderName: folder.name,
      folderId: folder.id,
      intendedParentFolderId,
      actualParents,
      parentMatch,
    });

    if (intendedParentFolderId && !parentMatch) {
      console.warn('[google-drive][folder-parent-check] created folder is not attached to the intended parent', {
        folderName: folder.name,
        folderId: folder.id,
        intendedParentFolderId,
        actualParents,
        driveId: metadata.driveId,
      });
    }

    console.info('[google-drive][folder:create] folder created', {
      folderName: folder.name,
      folderId: folder.id,
      parentFolderId: input.parentFolderId ?? null,
    });
    return folder;
  } catch (error) {
    const details = getGoogleErrorDetails(error);
    console.error('[google-drive][folder:create] folder creation failed', {
      folderName: input.name,
      parentFolderId: input.parentFolderId ?? null,
      ...details,
    });
    const message = details.message;
    throw new Error(message);
  }
}

export async function uploadFileToFolder(input: DriveUploadInput): Promise<DriveUploadResult> {
  const drive = await authenticateDrive();
  const mimeType = input.mimeType || 'application/octet-stream';
  try {
    const arrayBuffer = await input.file.arrayBuffer();
    console.info('[upload][file-buffer]', {
      folderId: input.folderId,
      fileName: input.fileName,
      mimeType,
      arrayBufferSuccess: true,
      bufferSize: arrayBuffer.byteLength,
    });
  } catch (error) {
    logUploadFailure('file-buffer', error, {
      folderId: input.folderId,
      fileName: input.fileName,
      mimeType,
      fileSize: input.fileSize,
    });
    throw error;
  }

  const body = Readable.fromWeb(input.file.stream() as unknown as ReadableStream<Uint8Array>);

  try {
    const response = await drive.files.create({
      requestBody: {
        name: input.fileName,
        mimeType,
        parents: [input.folderId],
      },
      media: {
        mimeType,
        body,
      },
      fields:
        'id,name,parents,driveId,owners(emailAddress,displayName),permissions(emailAddress,role,type,deleted),webViewLink,mimeType,size,thumbnailLink',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    if (!response.data?.id) {
      throw new Error('Google Drive upload returned no file id');
    }

    const metadata = await fetchDriveUploadMetadata(response.data.id);

    console.info('[upload][drive-upload]', {
      driveFileId: metadata.id,
      driveFileUrl: metadata.webViewLink,
      mimeType: metadata.mimeType,
      fileSize: metadata.size,
      parents: metadata.parents ?? [],
      driveId: metadata.driveId,
    });

    return {
      driveFileId: metadata.id,
      driveFileUrl: metadata.webViewLink ?? `https://drive.google.com/file/d/${metadata.id}/view`,
      mimeType: metadata.mimeType ?? mimeType,
      fileSize: metadata.size ?? input.fileSize,
      uploadStatus: 'uploaded',
      thumbnailLink: metadata.thumbnailLink,
      parents: metadata.parents ?? [],
      driveId: metadata.driveId,
      owners: metadata.owners,
      permissions: metadata.permissions,
      webViewLink: metadata.webViewLink ?? `https://drive.google.com/file/d/${metadata.id}/view`,
    };
  } catch (error) {
    const details = getGoogleErrorDetails(error);
    logUploadFailure('drive-upload', error, {
      driveFileName: input.fileName,
      folderId: input.folderId,
      fileSize: input.fileSize,
      mimeType,
      ...details,
    });
    throw new Error(details.message);
  }
}

export async function findFolder(name: string, parentFolderId?: string): Promise<DriveFolderResult | null> {
  const drive = await authenticateDrive();
  const safeName = name.replace(/'/g, "\\'");
  const parentClause = parentFolderId ? ` and '${parentFolderId}' in parents` : '';

  try {
    console.info('[google-drive][folder:find] searching folder', {
      folderName: name,
      parentFolderId: parentFolderId ?? null,
    });

    const response = await drive.files.list({
      q: `mimeType = 'application/vnd.google-apps.folder' and trashed = false and name = '${safeName}'${parentClause}`,
      fields: 'files(id,name,webViewLink,thumbnailLink,mimeType)',
      spaces: 'drive',
      pageSize: 1,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives',
      supportsAllDrives: true,
    });

    const file = response.data.files?.[0];
    if (!file) {
      console.info('[google-drive][folder:find] folder not found', {
        folderName: name,
        parentFolderId: parentFolderId ?? null,
      });
      return null;
    }

    const folder = toFolderResult(file);
    console.info('[google-drive][folder:find] folder found', {
      folderName: folder.name,
      folderId: folder.id,
      parentFolderId: parentFolderId ?? null,
    });
    return folder;
  } catch (error) {
    const details = getGoogleErrorDetails(error);
    console.error('[google-drive][folder:find] folder lookup failed', {
      folderName: name,
      parentFolderId: parentFolderId ?? null,
      ...details,
    });
    const message = details.message;
    throw new Error(message);
  }
}

export async function getFolderAccessDiagnostics(
  folderId: string,
  serviceAccountEmail?: string
): Promise<DriveFolderAccessDiagnostics> {
  const drive = await authenticateDrive();

  try {
    const response = await drive.files.get({
      fileId: folderId,
      fields:
        'id,name,driveId,capabilities(canAddChildren,canEdit),permissions(emailAddress,role,type,deleted)',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    const file = response.data;
    if (!file.id || !file.name) {
      throw new Error('Parent folder diagnostics returned incomplete metadata');
    }

    const permissions = file.permissions ?? [];
    const matchingPermission = serviceAccountEmail
      ? permissions.find((permission) => {
        if (permission.deleted) {
          return false;
        }
        return (permission.emailAddress || '').toLowerCase() === serviceAccountEmail.toLowerCase();
      })
      : undefined;

    const driveType = file.driveId ? 'shared-drive' : 'my-drive';
    const inheritedPermissions = driveType === 'shared-drive' ? !matchingPermission : null;
    const canEdit = file.capabilities?.canEdit ?? null;
    const canAddChildren = file.capabilities?.canAddChildren ?? null;
    const role = matchingPermission?.role ?? null;
    const serviceAccountHasEditorAccess =
      driveType === 'shared-drive'
        ? canEdit === true && canAddChildren === true
        : role
          ? ['owner', 'organizer', 'fileOrganizer', 'writer'].includes(role)
          : serviceAccountEmail
            ? false
            : null;

    console.info('[google-drive][drive-metadata]', {
      folderId: file.id,
      folderName: file.name,
      driveId: file.driveId ?? null,
      rawMetadataKeys: Object.keys(file),
      evaluatedDriveType: driveType,
    });

    console.info('[google-drive][permission-validation]', {
      folderId: file.id,
      folderName: file.name,
      driveType,
      inheritedPermissions,
      capabilityFlags: {
        canEdit,
        canAddChildren,
      },
      matchingRole: role,
      evaluatedResult: serviceAccountHasEditorAccess,
    });

    const diagnostics: DriveFolderAccessDiagnostics = {
      id: file.id,
      name: file.name,
      driveType,
      inheritedPermissions,
      canAddChildren,
      canEdit,
      serviceAccountHasEditorAccess,
    };

    console.info('[google-drive][parent:access] diagnostics', {
      folderId: diagnostics.id,
      folderName: diagnostics.name,
      driveType: diagnostics.driveType,
      inheritedPermissions: diagnostics.inheritedPermissions,
      canAddChildren: diagnostics.canAddChildren,
      canEdit: diagnostics.canEdit,
      serviceAccountEmail: serviceAccountEmail ?? null,
      serviceAccountHasEditorAccess: diagnostics.serviceAccountHasEditorAccess,
    });

    return diagnostics;
  } catch (error) {
    const details = getGoogleErrorDetails(error);
    console.error('[google-drive][parent:access] diagnostics failed', {
      folderId,
      serviceAccountEmail: serviceAccountEmail ?? null,
      ...details,
    });
    throw new Error(details.message);
  }
}

export function generateDriveLink(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export function generatePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}
