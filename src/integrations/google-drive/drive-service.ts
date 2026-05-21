import type { drive_v3 } from 'googleapis';
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
      fields: 'id,name,capabilities(canAddChildren,canEdit),permissions(emailAddress,role,type,deleted)',
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

    const role = matchingPermission?.role ?? null;
    const serviceAccountHasEditorAccess = role
      ? ['owner', 'organizer', 'fileOrganizer', 'writer'].includes(role)
      : serviceAccountEmail
        ? false
        : null;

    const diagnostics: DriveFolderAccessDiagnostics = {
      id: file.id,
      name: file.name,
      canAddChildren: file.capabilities?.canAddChildren ?? null,
      canEdit: file.capabilities?.canEdit ?? null,
      serviceAccountHasEditorAccess,
    };

    console.info('[google-drive][parent:access] diagnostics', {
      folderId: diagnostics.id,
      folderName: diagnostics.name,
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
