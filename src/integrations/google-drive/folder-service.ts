import {
  createFolder,
  findFolder,
  generateDriveLink,
  getFolderAccessDiagnostics,
} from './drive-service';
import { getDriveRootFolderId, getDriveServiceAccountEmail } from './drive-client';
import type { ClientDriveFolders, DriveFolderResult } from './types';
import type { AssetType } from '@/types/index';

const AGENCY_ROOT_FOLDER_NAME = 'Agency Content Operations';
const CLIENT_SUBFOLDERS = ['Reels', 'Posters', 'Exports'] as const;
const ASSET_FOLDER_NAMES: Record<AssetType | 'export', string> = {
  reel: 'Reels',
  poster: 'Posters',
  export: 'Exports',
};

const assetDriveFolderCache = new Map<string, Promise<DriveFolderResult | null>>();

function toFolderResult(folder: DriveFolderResult, fallbackName: string): DriveFolderResult {
  return {
    ...folder,
    name: folder.name || fallbackName,
    url: folder.url || generateDriveLink(folder.id),
    webViewLink: folder.webViewLink || generateDriveLink(folder.id),
  };
}

export async function createClientDriveFolders(clientName: string): Promise<ClientDriveFolders> {
  const rootName = clientName.trim();
  if (!rootName) {
    throw new Error('Client name is required to create Drive folders');
  }

  console.info('[google-drive][provision] start provisioning client folders', {
    clientName: rootName,
  });

  const driveRootFolderId = getDriveRootFolderId();
  const serviceAccountEmail = getDriveServiceAccountEmail();

  if (!driveRootFolderId) {
    console.warn('[google-drive][provision] parent folder id is not configured; provisioning will use service account root', {
      expectedEnvKeys: ['GOOGLE_DRIVE_PARENT_FOLDER_ID', 'GOOGLE_DRIVE_ROOT_FOLDER_ID'],
    });
  } else {
    console.info('[google-drive][provision] validating parent folder access', {
      parentFolderId: driveRootFolderId,
      serviceAccountEmail: serviceAccountEmail ?? null,
    });

    const parentDiagnostics = await getFolderAccessDiagnostics(driveRootFolderId, serviceAccountEmail);

    if (parentDiagnostics.canAddChildren === false || parentDiagnostics.serviceAccountHasEditorAccess === false) {
      throw new Error(
        `Service account lacks editor access to parent folder ${driveRootFolderId}. Share the folder with ${
          serviceAccountEmail ?? 'the configured service account'
        } as Editor`
      );
    }
  }

  console.info('[google-drive][provision] resolving agency root folder', {
    agencyRootName: AGENCY_ROOT_FOLDER_NAME,
    parentFolderId: driveRootFolderId ?? null,
  });

  const agencyRoot =
    (await findFolder(AGENCY_ROOT_FOLDER_NAME, driveRootFolderId)) ??
    (await createFolder({ name: AGENCY_ROOT_FOLDER_NAME, parentFolderId: driveRootFolderId }));

  console.info('[google-drive][provision] agency root resolved', {
    folderId: agencyRoot.id,
    folderName: agencyRoot.name,
  });

  console.info('[google-drive][provision] resolving client root folder', {
    clientName: rootName,
    parentFolderId: agencyRoot.id,
  });

  const existingRoot = await findFolder(rootName, agencyRoot.id);
  const root = existingRoot ?? (await createFolder({ name: rootName, parentFolderId: agencyRoot.id }));

  console.info('[google-drive][provision] client root resolved', {
    folderId: root.id,
    folderName: root.name,
    created: !existingRoot,
  });

  const [reels, posters, exportsFolder] = await Promise.all(
    CLIENT_SUBFOLDERS.map(async (subfolderName) => {
      console.info('[google-drive][provision] resolving client subfolder', {
        clientName: rootName,
        subfolderName,
        parentFolderId: root.id,
      });
      const existing = await findFolder(subfolderName, root.id);
      const created = existing ?? (await createFolder({ name: subfolderName, parentFolderId: root.id }));
      console.info('[google-drive][provision] client subfolder resolved', {
        clientName: rootName,
        subfolderName,
        folderId: created.id,
        created: !existing,
      });
      return toFolderResult(created, subfolderName);
    })
  );

  console.info('[google-drive][provision] provisioning completed', {
    clientName: rootName,
    rootFolderId: root.id,
    reelsFolderId: reels.id,
    postersFolderId: posters.id,
    exportsFolderId: exportsFolder.id,
  });

  return {
    root: toFolderResult(root, rootName),
    reels,
    posters,
    exports: exportsFolder,
  };
}

export async function getAssetDriveFolder(
  clientDriveFolderId: string | null | undefined,
  assetType: AssetType | 'export'
): Promise<DriveFolderResult | null> {
  if (!clientDriveFolderId) {
    return null;
  }

  const folderName = ASSET_FOLDER_NAMES[assetType];
  if (!folderName) {
    return null;
  }

  const cacheKey = `${clientDriveFolderId}:${assetType}`;
  const cached = assetDriveFolderCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const lookup = (async () => {
    try {
      const folder = await findFolder(folderName, clientDriveFolderId);
      return folder ? toFolderResult(folder, folderName) : null;
    } catch (error) {
      assetDriveFolderCache.delete(cacheKey);
      throw error;
    }
  })();

  assetDriveFolderCache.set(cacheKey, lookup);
  return lookup;
}
