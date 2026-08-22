import { getAppUrl } from "@/lib/app-url"
import FormData from "form-data"
import Mailgun from "mailgun.js"
import { enqueueBackgroundJob } from "@/lib/background-queue"
import {
  logMailgunEnvCheck,
  logProductionRuntimeError,
} from "@/lib/runtime-diagnostics"

const MAILGUN_LOG_PREFIX = "[notifications][mailgun]"

type NotificationRecipient = {
  email?: string | null
  name?: string | null
}

export interface AssetUploadNotificationInput {
  assetId: string
  assetTitle: string
  clientName: string
  assetType: string
  assetStatus: string
  uploadedBy?: NotificationRecipient
  uploadedAt: string | Date
}

export interface RevisionUploadNotificationInput {
  assetId: string
  assetTitle: string
  revisionVersion: number
  uploadedBy?: NotificationRecipient
  uploadedAt: string | Date
}

type MailgunClient = ReturnType<Mailgun["client"]>

let mailgunClient: MailgunClient | null = null
let mailgunInitializationLogged = false

function getMailgunConfig() {
  logMailgunEnvCheck()

  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN
  const from = process.env.MAILGUN_FROM
  const to = process.env.MAIL_NOTIFICATION_TO

  return { apiKey, domain, from, to }
}

function formatTimestamp(timestamp: string | Date): string {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof  // discriminate string|Date at I/O boundary
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp
  return Number.isNaN(date.getTime()) ? String(timestamp) : date.toISOString()
}

function formatSender(recipient?: NotificationRecipient): string {
  const name = recipient?.name?.trim()
  const email = recipient?.email?.trim()

  if (name && email) {
    return `${name} <${email}>`
  }

  return name || email || "Unknown"
}

function formatAssetDashboardUrl(assetId: string): string {
  const baseUrl = getAppUrl()

  return new URL(`/dashboard/assets/${assetId}`, baseUrl).toString()
}

function getMailgunClient(): MailgunClient | null {
  if (mailgunClient) {
    return mailgunClient
  }

  const { apiKey, domain } = getMailgunConfig()
  if (!apiKey || !domain) {
    if (!mailgunInitializationLogged) {
      mailgunInitializationLogged = true
      console.warn(`${MAILGUN_LOG_PREFIX} initialization skipped`, {
        configured: false,
      })
    }
    return null
  }

  const mailgun = new Mailgun(FormData)
  mailgunClient = mailgun.client({
    username: "api",
    key: apiKey,
    url: "https://api.mailgun.net",
  })

  if (!mailgunInitializationLogged) {
    mailgunInitializationLogged = true
    console.info(`${MAILGUN_LOG_PREFIX} initialization`, {
      configured: true,
      domain,
    })
  }

  return mailgunClient
}

async function sendMailgunNotification(
  subject: string,
  text: string,
  html: string,
  // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type  // dynamic notification context payload
  context: Record<string, unknown>,
): Promise<void> {
  const { domain, from, to } = getMailgunConfig()

  if (!domain || !from || !to) {
    console.warn(`${MAILGUN_LOG_PREFIX} failure`, {
      reason: "missing-configuration",
      ...context,
    })
    return
  }

  const client = getMailgunClient()
  if (!client) {
    console.warn(`${MAILGUN_LOG_PREFIX} failure`, {
      reason: "client-unavailable",
      ...context,
    })
    return
  }

  console.info(`${MAILGUN_LOG_PREFIX} send-start`, {
    subject,
    to,
    ...context,
  })

  // enqueue mail send to avoid blocking request lifecycle; let queue handle retries
  enqueueBackgroundJob(
    async () => {
      try {
        await client.messages.create(domain, {
          from,
          to,
          subject,
          text,
          html,
        })

        console.info(`${MAILGUN_LOG_PREFIX} send-success`, {
          subject,
          to,
          ...context,
        })
      } catch (error) {
        logProductionRuntimeError("mailgun-send", error, {
          subject,
          to,
          ...context,
        })
        console.error(`${MAILGUN_LOG_PREFIX} send-failure`, {
          subject,
          to,
          message: error instanceof Error ? error.message : "unknown",
          ...context,
        })
        throw error
      }
    },
    `mailgun:${context.kind ?? "unknown"}:${context.assetId ?? context.subject ?? Date.now()}`,
  )
}

export async function sendAssetUploadNotification(
  input: AssetUploadNotificationInput,
): Promise<void> {
  const uploadedBy = formatSender(input.uploadedBy)
  const uploadedAt = formatTimestamp(input.uploadedAt)
  const dashboardUrl = formatAssetDashboardUrl(input.assetId)

  const text = [
    "New asset uploaded",
    `Asset title: ${input.assetTitle}`,
    `Client name: ${input.clientName}`,
    `Asset type: ${input.assetType}`,
    `Uploaded by: ${uploadedBy}`,
    `Upload timestamp: ${uploadedAt}`,
    `Asset status: ${input.assetStatus}`,
    `Dashboard URL: ${dashboardUrl}`,
  ].join("\n")

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
  `

  await sendMailgunNotification("New Asset Uploaded", text, html, {
    kind: "asset-upload",
    assetId: input.assetId,
    assetTitle: input.assetTitle,
    clientName: input.clientName,
  })
}

export async function sendRevisionUploadNotification(
  input: RevisionUploadNotificationInput,
): Promise<void> {
  const uploadedBy = formatSender(input.uploadedBy)
  const uploadedAt = formatTimestamp(input.uploadedAt)
  const dashboardUrl = formatAssetDashboardUrl(input.assetId)

  const text = [
    "New asset revision uploaded",
    `Asset title: ${input.assetTitle}`,
    `Revision version: ${input.revisionVersion}`,
    `Uploaded by: ${uploadedBy}`,
    `Revision timestamp: ${uploadedAt}`,
    `Asset link: ${dashboardUrl}`,
  ].join("\n")

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
  `

  await sendMailgunNotification("New Asset Revision Uploaded", text, html, {
    kind: "revision-upload",
    assetId: input.assetId,
    assetTitle: input.assetTitle,
    revisionVersion: input.revisionVersion,
  })
}

export interface DesignerNotificationInput {
  notificationType: "comment_added" | "revision_requested"
  assetId: string
  assetTitle: string
  assetType: string
  clientId: string
  clientName: string
  commentMessage?: string | null
  designerId: string
  designerEmail: string
  designerName?: string | null
  requestedBy: NotificationRecipient
  timestamp: string | Date
}

export async function sendDesignerNotification(
  input: DesignerNotificationInput,
): Promise<void> {
  const requestedBy = formatSender(input.requestedBy)
  const timeStr = formatTimestamp(input.timestamp)
  const dashboardUrl = formatAssetDashboardUrl(input.assetId)
  const clientUrl = new URL(
    `/dashboard/clients/${input.clientId}`,
    dashboardUrl,
  ).toString()

  const titleText =
    input.notificationType === "revision_requested"
      ? "Revision Required"
      : "New Comment on Asset"

  const statusText =
    input.notificationType === "revision_requested"
      ? "Revision Requested"
      : "Comment Added"

  const text = [
    `${titleText}: ${input.assetTitle}`,
    `Client: ${input.clientName}`,
    `Asset: ${input.assetTitle}`,
    `Asset Type: ${input.assetType}`,
    input.commentMessage ? `Comment: ${input.commentMessage}` : "",
    `Status: ${statusText}`,
    `Requested By: ${requestedBy}`,
    `Time: ${timeStr}`,
    `Open Asset: ${dashboardUrl}`,
    `Open Client: ${clientUrl}`,
  ]
    .filter(Boolean)
    .join("\n")

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin: 0 0 16px;">${titleText}: ${input.assetTitle}</h2>
      <ul style="padding-left: 20px; margin: 0;">
        <li><strong>Client:</strong> ${input.clientName}</li>
        <li><strong>Asset:</strong> ${input.assetTitle}</li>
        <li><strong>Asset Type:</strong> ${input.assetType}</li>
        ${input.commentMessage ? `<li><strong>Comment:</strong> ${input.commentMessage}</li>` : ""}
        <li><strong>Status:</strong> ${statusText}</li>
        <li><strong>Requested By:</strong> ${requestedBy}</li>
        <li><strong>Time:</strong> ${timeStr}</li>
        <li><strong>Open Asset:</strong> <a href="${dashboardUrl}">${dashboardUrl}</a></li>
        <li><strong>Open Client:</strong> <a href="${clientUrl}">${clientUrl}</a></li>
      </ul>
    </div>
  `

  // We temporarily override the configured `to` address with the designer's email
  // Normally mailgunConfig.to is used, but for specific targeted notifications we send directly.
  const { domain, from } = getMailgunConfig()
  if (!domain || !from) {
    console.warn("[notifications][mailgun] failure", {
      reason: "missing-configuration",
    })
    return
  }

  const client = getMailgunClient()
  if (!client) {
    console.warn("[notifications][mailgun] failure", {
      reason: "client-unavailable",
    })
    return
  }

  const subject = `${titleText}: ${input.assetTitle}`
  const to = input.designerEmail

  console.info("[notifications][mailgun] send-start", {
    subject,
    to,
    notification_type: input.notificationType,
    asset_id: input.assetId,
    designer_id: input.designerId,
    email: input.designerEmail,
  })

  enqueueBackgroundJob(async () => {
    try {
      await client.messages.create(domain, {
        from,
        to,
        subject,
        text,
        html,
      })

      console.info("[notifications][mailgun] send-success", {
        subject,
        to,
        notification_type: input.notificationType,
        asset_id: input.assetId,
        designer_id: input.designerId,
        email: input.designerEmail,
      })
    } catch (error) {
      logProductionRuntimeError("mailgun-send", error, {
        subject,
        to,
        asset_id: input.assetId,
      })
      console.error("[notifications][mailgun] send-failure", {
        subject,
        to,
        notification_type: input.notificationType,
        asset_id: input.assetId,
        designer_id: input.designerId,
        email: input.designerEmail,
        message: error instanceof Error ? error.message : "unknown",
      })
      throw error
    }
  }, `mailgun:${input.notificationType}:${input.assetId}:${Date.now()}`)
}

export interface ReferenceNotificationInput {
  clientId: string
  clientName: string
  referenceId: string
  referenceTitle: string
  referenceType: string
  referenceDescription?: string | null
  referenceUrl: string
  addedBy: NotificationRecipient
  timestamp: string | Date
  designerEmail: string
  designerId: string
}

export async function sendReferenceNotification(
  input: ReferenceNotificationInput,
): Promise<void> {
  const addedBy = formatSender(input.addedBy)
  const timeStr = formatTimestamp(input.timestamp)
  const baseUrl = getAppUrl()
  const clientUrl = new URL(
    `/dashboard/clients/${input.clientId}`,
    baseUrl,
  ).toString()

  const titleText = `New Reference Added: ${input.clientName}`

  const text = [
    titleText,
    `Client: ${input.clientName}`,
    `Reference Title: ${input.referenceTitle}`,
    `Reference Type: ${input.referenceType}`,
    input.referenceDescription
      ? `Reference Description: ${input.referenceDescription}`
      : "",
    `Added By: ${addedBy}`,
    `Added At: ${timeStr}`,
    `Reference URL: ${input.referenceUrl}`,
    `Open Client: ${clientUrl}`,
  ]
    .filter(Boolean)
    .join("\n")

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin: 0 0 16px;">${titleText}</h2>
      <ul style="padding-left: 20px; margin: 0;">
        <li><strong>Client:</strong> ${input.clientName}</li>
        <li><strong>Reference Title:</strong> ${input.referenceTitle}</li>
        <li><strong>Reference Type:</strong> ${input.referenceType}</li>
        ${input.referenceDescription ? `<li><strong>Description:</strong> ${input.referenceDescription}</li>` : ""}
        <li><strong>Added By:</strong> ${addedBy}</li>
        <li><strong>Added At:</strong> ${timeStr}</li>
        <li><strong>Reference URL:</strong> <a href="${input.referenceUrl}">${input.referenceUrl}</a></li>
        <li><strong>Open Client:</strong> <a href="${clientUrl}">${clientUrl}</a></li>
      </ul>
    </div>
  `

  const { domain, from } = getMailgunConfig()
  if (!domain || !from) {
    console.warn("[notifications][mailgun] failure", {
      reason: "missing-configuration",
    })
    return
  }

  const client = getMailgunClient()
  if (!client) {
    console.warn("[notifications][mailgun] failure", {
      reason: "client-unavailable",
    })
    return
  }

  const subject = titleText
  const to = input.designerEmail

  console.info("[notifications][mailgun] send-start", {
    subject,
    to,
    notification_type: "reference_added",
    client_id: input.clientId,
    reference_id: input.referenceId,
    designer_id: input.designerId,
    recipient_email: input.designerEmail,
    status: "pending",
  })

  enqueueBackgroundJob(async () => {
    try {
      await client.messages.create(domain, {
        from,
        to,
        subject,
        text,
        html,
      })

      console.info("[notifications][mailgun] send-success", {
        subject,
        to,
        notification_type: "reference_added",
        client_id: input.clientId,
        reference_id: input.referenceId,
        designer_id: input.designerId,
        recipient_email: input.designerEmail,
        status: "success",
      })
    } catch (error) {
      logProductionRuntimeError("mailgun-send", error, {
        subject,
        to,
        client_id: input.clientId,
        reference_id: input.referenceId,
      })
      console.error("[notifications][mailgun] send-failure", {
        subject,
        to,
        notification_type: "reference_added",
        client_id: input.clientId,
        reference_id: input.referenceId,
        designer_id: input.designerId,
        recipient_email: input.designerEmail,
        status: "failed",
        message: error instanceof Error ? error.message : "unknown",
      })
      throw error
    }
  }, `mailgun:reference_added:${input.referenceId}:${input.designerId}:${Date.now()}`)
}
