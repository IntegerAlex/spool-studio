import type { drive_v3 } from 'googleapis';

export interface DriveAuthConfig {
  clientEmail: string;
  privateKey: string;
  delegatedUser?: string;
  rootFolderId?: string;
  projectId?: string;
}

export interface DriveFolderInput {
  name: string;
  parentFolderId?: string;
}

export interface DriveFolderResult {
  id: string;
  name: string;
  url: string;
  webViewLink: string;
  thumbnailLink?: string | null;
  mimeType: string;
}

export interface DriveFolderAccessDiagnostics {
  id: string;
  name: string;
  driveType: 'shared-drive' | 'my-drive' | 'unknown';
  inheritedPermissions: boolean | null;
  canAddChildren: boolean | null;
  canEdit: boolean | null;
  serviceAccountHasEditorAccess: boolean | null;
}

export interface ClientDriveFolders {
  root: DriveFolderResult;
  reels: DriveFolderResult;
  posters: DriveFolderResult;
  exports: DriveFolderResult;
}

export type DriveClient = drive_v3.Drive;
