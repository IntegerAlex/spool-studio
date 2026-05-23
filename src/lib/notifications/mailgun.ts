import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import { logMailgunEnvCheck, logProductionRuntimeError } from '@/lib/runtime-diagnostics';

const MAILGUN_LOG_PREFIX = '[notifications][mailgun]';

type NotificationRecipient = {
  email?: string | null;
  name?: string | null;
};

export interface AssetUploadNotificationInput {
  assetId: string;
  assetTitle: string;
  clientName: string;
  assetType: string;
  assetStatus: string;
  uploadedBy?: NotificationRecipient;
  uploadedAt: string | Date;
}

export interface RevisionUploadNotificationInput {
  assetId: string;
  assetTitle: string;
  revisionVersion: number;
  uploadedBy?: NotificationRecipient;
  uploadedAt: string | Date;
}

type MailgunClient = ReturnType<Mailgun['client']>;

let mailgunClient: MailgunClient | null = null;
let mailgunInitializationLogged = false;

function getMailgunConfig() {
  logMailgunEnvCheck();

  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.MAILGUN_FROM;
  const to = process.env.MAIL_NOTIFICATION_TO;

  console.log('[mailgun][env-check]', {
    apiKeyPresent: !!process.env.MAILGUN_API_KEY,
    domainPresent: !!process.env.MAILGUN_DOMAIN,
    fromPresent: !!process.env.MAILGUN_FROM,
    toPresent: !!process.env.MAIL_NOTIFICATION_TO,
  });

  return { apiKey, domain, from, to };
}

function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return Number.isNaN(date.getTime()) ? String(timestamp) : date.toISOString();
}

function formatSender(recipient?: NotificationRecipient): string {
  const name = recipient?.name?.trim();
  const email = recipient?.email?.trim();

  if (name && email) {
    return `${name} <${email}>`;
  }

  return name || email || 'Unknown';
}

function formatAssetDashboardUrl(assetId: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  return new URL(`/dashboard/assets/${assetId}`, baseUrl).toString();
}

function getMailgunClient(): MailgunClient | null {
  if (mailgunClient) {
    return mailgunClient;
  }

  const { apiKey, domain } = getMailgunConfig();
  if (!apiKey || !domain) {
    if (!mailgunInitializationLogged) {
      mailgunInitializationLogged = true;
      console.warn(`${MAILGUN_LOG_PREFIX} initialization skipped`, {
        configured: false,
      });
    }
    return null;
  }

  const mailgun = new Mailgun(FormData);
  mailgunClient = mailgun.client({
    username: 'api',
    key: apiKey,
    url: 'https://api.mailgun.net',
  });

  if (!mailgunInitializationLogged) {
    mailgunInitializationLogged = true;
    console.info(`${MAILGUN_LOG_PREFIX} initialization`, {
      configured: true,
      domain,
    });
  }

  return mailgunClient;
}

async function sendMailgunNotification(
  subject: string,
  text: string,
  html: string,
  context: Record<string, unknown>
): Promise<void> {
  const { domain, from, to } = getMailgunConfig();

  if (!domain || !from || !to) {
    console.warn(`${MAILGUN_LOG_PREFIX} failure`, {
      reason: 'missing-configuration',
      ...context,
    });
    return;
  }

  const client = getMailgunClient();
  if (!client) {
    console.warn(`${MAILGUN_LOG_PREFIX} failure`, {
      reason: 'client-unavailable',
      ...context,
    });
    return;
  }

  console.info(`${MAILGUN_LOG_PREFIX} send-start`, {
    subject,
    to,
    ...context,
  });

  try {
    await client.messages.create(domain, {
      from,
      to,
      subject,
      text,
      html,
    });

    console.info(`${MAILGUN_LOG_PREFIX} send-success`, {
      subject,
      to,
      ...context,
    });
  } catch (error) {
    logProductionRuntimeError('mailgun-send', error, {
      subject,
      to,
      ...context,
    });
    console.error(`${MAILGUN_LOG_PREFIX} send-failure`, {
      subject,
      to,
      message: error instanceof Error ? error.message : 'unknown',
      ...context,
    });
  }
}

export async function sendAssetUploadNotification(
  input: AssetUploadNotificationInput
): Promise<void> {
  const uploadedBy = formatSender(input.uploadedBy);
  const uploadedAt = formatTimestamp(input.uploadedAt);
  const dashboardUrl = formatAssetDashboardUrl(input.assetId);

  const text = [
    'New asset uploaded',
    `Asset title: ${input.assetTitle}`,
    `Client name: ${input.clientName}`,
    `Asset type: ${input.assetType}`,
    `Uploaded by: ${uploadedBy}`,
    `Upload timestamp: ${uploadedAt}`,
    `Asset status: ${input.assetStatus}`,
    `Dashboard URL: ${dashboardUrl}`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin: 0 0 16px;">New Asset Uploaded</h2>
      <ul style="padding-left: 20px; margin: 0;">
        <li><strong>Asset title:</strong> ${input.assetTitle}</li>
        <li><strong>Client name:</strong> ${input.clientName}</li>
        <li><strong>Asset type:</strong> ${input.assetType}</li>
        <li><strong>Uploaded by:</strong> ${uploadedBy}</li>
        <li><strong>Upload timestamp:</strong> ${uploadedAt}</li>
        <li><strong>Asset status:</strong> ${input.assetStatus}</li>
        <li><strong>Dashboard URL:</strong> <a href="${dashboardUrl}">${dashboardUrl}</a></li>
      </ul>
    </div>
  `;

  await sendMailgunNotification('New Asset Uploaded', text, html, {
    kind: 'asset-upload',
    assetId: input.assetId,
    assetTitle: input.assetTitle,
    clientName: input.clientName,
  });
}

export async function sendRevisionUploadNotification(
  input: RevisionUploadNotificationInput
): Promise<void> {
  const uploadedBy = formatSender(input.uploadedBy);
  const uploadedAt = formatTimestamp(input.uploadedAt);
  const dashboardUrl = formatAssetDashboardUrl(input.assetId);

  const text = [
    'New asset revision uploaded',
    `Asset title: ${input.assetTitle}`,
    `Revision version: ${input.revisionVersion}`,
    `Uploaded by: ${uploadedBy}`,
    `Revision timestamp: ${uploadedAt}`,
    `Asset link: ${dashboardUrl}`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin: 0 0 16px;">New Asset Revision Uploaded</h2>
      <ul style="padding-left: 20px; margin: 0;">
        <li><strong>Asset title:</strong> ${input.assetTitle}</li>
        <li><strong>Revision version:</strong> ${input.revisionVersion}</li>
        <li><strong>Uploaded by:</strong> ${uploadedBy}</li>
        <li><strong>Revision timestamp:</strong> ${uploadedAt}</li>
        <li><strong>Asset link:</strong> <a href="${dashboardUrl}">${dashboardUrl}</a></li>
      </ul>
    </div>
  `;

  await sendMailgunNotification('New Asset Revision Uploaded', text, html, {
    kind: 'revision-upload',
    assetId: input.assetId,
    assetTitle: input.assetTitle,
    revisionVersion: input.revisionVersion,
  });
}

