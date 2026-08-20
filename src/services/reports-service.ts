import { getClientById } from "@/repositories/clients-repository"
import { listClientAssetsForReport } from "@/repositories/reports-repository"

export interface ReportOptions {
  clientId: string
  startDate: Date
  endDate: Date
  isMonthly?: boolean
  month?: number
  year?: number
}

export interface MonthlyReportPayload {
  client: {
    id: string
    name: string
    instagramHandle: string
    brandColor?: string
    contractStartDate?: string | null
    contractEndDate?: string | null
  }
  period: {
    mode: "monthly" | "custom"
    displayLabel: string
    startDate: string
    endDate: string
    month?: string
    monthNumber?: number
    year?: number
  }
  summary: {
    postersDelivered: number
    reelsDelivered: number
    totalDelivered: number
    monthlyTarget: number
    completionRate: number
    targetLabel: string
  }
  assets: Array<{
    id: string
    title: string
    type: "reel" | "poster"
    status: string
    uploadedAt: string | null
    approvedAt: string | null
    publishedAt: string | null
    driveFileUrl: string | null
  }>
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function formatShortDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0")
  const monthIndex = date.getUTCMonth()
  const year = date.getUTCFullYear()
  const monthAbbr = MONTH_NAMES[monthIndex].substring(0, 3)
  return `${day} ${monthAbbr} ${year}`
}

export async function generateReport(
  options: ReportOptions,
): Promise<MonthlyReportPayload | null> {
  const {
    clientId,
    startDate,
    endDate,
    isMonthly = false,
    month,
    year,
  } = options

  // For custom ranges, normalize endDate to end-of-day so the entire final day is included.
  // Monthly ranges already compute end-of-month (23:59:59.999) in generateMonthlyReport().
  const effectiveEndDate = new Date(endDate)
  if (!isMonthly) {
    effectiveEndDate.setUTCHours(23, 59, 59, 999)
  }

  const clientRecord = await getClientById(clientId)
  if (!clientRecord) {
    return null
  }

  const dbAssets = await listClientAssetsForReport(
    clientId,
    startDate,
    effectiveEndDate,
  )

  const postersDelivered = dbAssets.filter(
    (asset) => asset.type === "poster",
  ).length
  const reelsDelivered = dbAssets.filter(
    (asset) => asset.type === "reel",
  ).length
  const totalDelivered = postersDelivered + reelsDelivered

  const monthlyTarget =
    clientRecord.monthly_goal && clientRecord.monthly_goal > 0
      ? clientRecord.monthly_goal
      : (clientRecord.monthly_reels_target ?? 0) +
        (clientRecord.monthly_posts_target ?? 0)

  const completionRate =
    monthlyTarget > 0 ? Math.round((totalDelivered / monthlyTarget) * 100) : 0

  const assets = dbAssets.map((asset) => {
    let resolvedPublishTime: string | null = null
    if (asset.published_at) {
      resolvedPublishTime = new Date(asset.published_at).toISOString()
    } else if (asset.publish_date) {
      const timePart = asset.publish_time ?? "00:00:00"
      resolvedPublishTime = new Date(
        `${asset.publish_date}T${timePart}`,
      ).toISOString()
    } else {
      resolvedPublishTime = new Date(asset.created_at).toISOString()
    }

    return {
      id: asset.id,
      title: asset.title,
      type: asset.type,
      status: asset.status,
      uploadedAt: asset.uploaded_at
        ? new Date(asset.uploaded_at).toISOString()
        : null,
      approvedAt: asset.approved_at
        ? new Date(asset.approved_at).toISOString()
        : null,
      publishedAt: resolvedPublishTime,
      driveFileUrl: asset.drive_file_url || null,
    }
  })

  let period: MonthlyReportPayload["period"]

  if (isMonthly && month != null && year != null) {
    const monthName = MONTH_NAMES[month - 1] || String(month)
    period = {
      mode: "monthly",
      displayLabel: `${monthName} ${year}`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      month: monthName,
      monthNumber: month,
      year,
    }
  } else {
    const startFormatted = formatShortDate(startDate)
    const endFormatted = formatShortDate(effectiveEndDate)
    period = {
      mode: "custom",
      displayLabel: `${startFormatted} – ${endFormatted}`,
      startDate: startDate.toISOString(),
      endDate: effectiveEndDate.toISOString(),
    }
  }

  return {
    client: {
      id: clientRecord.id,
      name: clientRecord.name,
      instagramHandle: clientRecord.instagram_handle
        ? `@${clientRecord.instagram_handle.replace(/^@/, "")}`
        : "",
      brandColor: clientRecord.brand_color || undefined,
      contractStartDate: clientRecord.contract_start_date,
      contractEndDate: clientRecord.contract_end_date,
    },
    period,
    summary: {
      postersDelivered,
      reelsDelivered,
      totalDelivered,
      monthlyTarget,
      completionRate,
      targetLabel: isMonthly ? "Monthly Target" : "Monthly Target (per month)",
    },
    assets,
  }
}

export async function generateMonthlyReport(
  clientId: string,
  month: number,
  year: number,
): Promise<MonthlyReportPayload | null> {
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))

  return generateReport({
    clientId,
    startDate,
    endDate,
    isMonthly: true,
    month,
    year,
  })
}
