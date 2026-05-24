import { google } from 'googleapis';
import type { DriveClient, DriveAuthConfig } from './types';
import { logGoogleEnvCheck, logProductionRuntimeError } from '@/lib/runtime-diagnostics';

const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive'] as const;

function pickEnv(primaryKey: string, fallbackKey?: string): string | undefined {
  return process.env[primaryKey] || (fallbackKey ? process.env[fallbackKey] : undefined) || undefined;
}

function isLikelyValidPrivateKey(privateKey: string): boolean {
  return privateKey.includes('BEGIN PRIVATE KEY') && privateKey.includes('END PRIVATE KEY');
}

function logDriveAuthDiagnostics(config: {
  emailPresent: boolean;
  privateKeyPresent: boolean;
  privateKeyLikelyValid: boolean;
  privateKeyNewlineCount: number;
  parentFolderPresent: boolean;
  projectIdPresent: boolean;
  delegatedUserPresent: boolean;
}) {
  console.info('[google-drive][auth] configuration audit', config);
}

function getDriveAuthConfig(): DriveAuthConfig {
  logGoogleEnvCheck();

  const clientEmail = pickEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_DRIVE_CLIENT_EMAIL');
  const privateKey =
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n') ??
    process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const delegatedUser = process.env.GOOGLE_DRIVE_DELEGATED_USER;
  const rootFolderId = pickEnv('GOOGLE_DRIVE_PARENT_FOLDER_ID', 'GOOGLE_DRIVE_ROOT_FOLDER_ID');
  const projectId = process.env.GOOGLE_PROJECT_ID || undefined;

  logDriveAuthDiagnostics({
    emailPresent: Boolean(clientEmail),
    privateKeyPresent: Boolean(privateKey),
    privateKeyLikelyValid: Boolean(privateKey && isLikelyValidPrivateKey(privateKey)),
    privateKeyNewlineCount: privateKey ? privateKey.split('\n').length : 0,
    parentFolderPresent: Boolean(rootFolderId),
    projectIdPresent: Boolean(projectId),
    delegatedUserPresent: Boolean(delegatedUser),
  });

  if (!clientEmail) {
    throw new Error('Google Drive service account email is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_DRIVE_CLIENT_EMAIL');
  }

  if (!privateKey) {
    throw new Error('Google Drive service account private key is not configured. Set GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY or GOOGLE_DRIVE_PRIVATE_KEY');
  }

  if (!isLikelyValidPrivateKey(privateKey)) {
    throw new Error('Google Drive service account private key format is invalid. Ensure newline escaping is correct and the key includes BEGIN/END PRIVATE KEY markers');
  }

  return {
    clientEmail,
    privateKey,
    delegatedUser,
    rootFolderId,
    projectId,
  };
}

let cachedDriveClient: DriveClient | null = null;

async function createDriveAuthClient(): Promise<InstanceType<typeof google.auth.JWT>> {
  const config = getDriveAuthConfig();

  return new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: [...DRIVE_SCOPES],
    subject: config.delegatedUser,
  });
}

export async function authenticateDrive(): Promise<DriveClient> {
  if (cachedDriveClient) {
    console.info('[google-drive][auth] using cached Drive client');
    return cachedDriveClient;
  }

  try {
    const config = getDriveAuthConfig();
    console.info('[google-drive][auth] initializing JWT client', {
      serviceAccountEmail: config.clientEmail,
      parentFolderId: config.rootFolderId ?? null,
      projectIdPresent: Boolean(config.projectId),
      delegatedUserPresent: Boolean(config.delegatedUser),
    });

    const auth = await createDriveAuthClient();

    await auth.authorize();
    console.info('[google-drive][auth] service account authorization succeeded', {
      serviceAccountEmail: config.clientEmail,
      projectIdPresent: Boolean(config.projectId),
      delegatedUserPresent: Boolean(config.delegatedUser),
    });

    cachedDriveClient = google.drive({ version: 'v3', auth });
    return cachedDriveClient;
  } catch (error) {
    const maybe = error as {
      message?: string;
      code?: number;
      status?: number;
      response?: { status?: number; data?: unknown };
    };
    const message = maybe?.message ?? 'Google Drive authentication failed';
    logProductionRuntimeError('google-drive-auth', error, {
      code: maybe?.code ?? maybe?.status ?? maybe?.response?.status ?? null,
    });
    console.error('[google-drive][auth] service account authorization failed', {
      error: message,
      code: maybe?.code ?? maybe?.status ?? maybe?.response?.status ?? null,
      response: maybe?.response?.data ?? null,
    });
    throw new Error(message);
  }
}

export async function getDriveAuthHeaders(): Promise<HeadersInit> {
  const auth = await createDriveAuthClient();
  await auth.authorize();
  return auth.getRequestHeaders();
}

export function getDriveRootFolderId(): string | undefined {
  return pickEnv('GOOGLE_DRIVE_PARENT_FOLDER_ID', 'GOOGLE_DRIVE_ROOT_FOLDER_ID');
}

export function getDriveServiceAccountEmail(): string | undefined {
  return pickEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_DRIVE_CLIENT_EMAIL');
}
