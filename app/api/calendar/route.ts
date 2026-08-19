import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { expandRecurrence } from "@/lib/calendar-recurrence"
import { formatDateKey } from "@/lib/calendar-utils"
import { getPool } from "@/lib/db"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import type { CalendarEvent, RecurrenceRule } from "@/types/calendar"

function defaultMonthRange(): { start: string; end: string } {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start: formatDateKey(first), end: formatDateKey(last) }
}

function calendarQuery(includeDrafts: boolean): string {
  const publishStatuses = includeDrafts
    ? "'approved', 'published', 'scheduled', 'draft', 'in_design'"
    : "'approved', 'published', 'scheduled'"
  return `
(
  SELECT
    a.id AS source_id,
    'publish' AS kind,
    a.title AS title,
    a.client_id AS client_id,
    c.name AS client_name,
    CASE
      WHEN a.publish_date IS NOT NULL
        THEN (a.publish_date::text || 'T' || COALESCE(a.publish_time, '00:00:00'))
      WHEN a.scheduled_at IS NOT NULL
        THEN to_char(a.scheduled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')
      ELSE to_char(a.published_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')
    END AS start_value,
    '/dashboard/assets/' || a.id AS href,
    a.id AS asset_id,
    a.recurrence AS recurrence,
    NULL::text AS upload_queue_id,
    NULL::text AS platform,
    a.status AS status_value,
    NULL::text AS note,
    NULL::text AS caption_value,
    NULL::text AS contract_end_value
  FROM content_assets a
  LEFT JOIN clients c ON c.id = a.client_id
  WHERE a.created_by = $1
    AND a.status IN (${publishStatuses})
    AND (
      (a.publish_date IS NOT NULL AND a.publish_date BETWEEN ($2::date - interval '2 days') AND ($3::date + interval '2 days'))
      OR (a.scheduled_at IS NOT NULL AND a.scheduled_at BETWEEN $4::timestamptz AND $5::timestamptz)
      OR (a.published_at IS NOT NULL AND a.published_at BETWEEN $4::timestamptz AND $5::timestamptz)
      OR a.recurrence IS NOT NULL
    )
)
UNION ALL
(
  SELECT
    q.id AS source_id,
    'upload' AS kind,
    COALESCE(a.title, 'Upload') AS title,
    a.client_id AS client_id,
    c.name AS client_name,
    to_char(q.scheduled_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS start_value,
    '/dashboard/assets/' || a.id AS href,
    a.id AS asset_id,
    q.id AS upload_queue_id,
    q.recurrence AS recurrence,
    q.platform AS platform,
    q.status AS status_value,
    NULL::text AS note,
    q.caption AS caption_value,
    NULL::text AS contract_end_value
  FROM upload_queue q
  JOIN content_assets a ON a.id = q.asset_id
  LEFT JOIN clients c ON c.id = a.client_id
  WHERE a.created_by = $1
    AND q.scheduled_date IS NOT NULL
    AND (q.scheduled_date BETWEEN $4::timestamptz AND $5::timestamptz OR q.recurrence IS NOT NULL)
)
UNION ALL
(
  SELECT
    ('contract-' || c.id) AS source_id,
    'contract' AS kind,
    (c.name || ' contract') AS title,
    c.id AS client_id,
    c.name AS client_name,
    c.contract_start_date::text AS start_value,
    '/dashboard/clients/' || c.id AS href,
    NULL::text AS asset_id,
    NULL::text AS upload_queue_id,
    NULL::text AS platform,
    NULL::text AS status_value,
    NULL::text AS note,
    NULL::text AS caption_value,
    c.contract_end_date::text AS contract_end_value
  FROM clients c
  WHERE c.created_by = $1
    AND c.contract_start_date IS NOT NULL
    AND c.contract_start_date BETWEEN ($2::date - interval '2 days') AND ($3::date + interval '2 days')
)
UNION ALL
(
  SELECT
    a.id AS source_id,
    'approval' AS kind,
    a.title AS title,
    a.client_id AS client_id,
    c.name AS client_name,
    CASE
      WHEN a.publish_date IS NOT NULL
        THEN (a.publish_date::text || 'T00:00:00')
      WHEN a.scheduled_at IS NOT NULL
        THEN to_char(a.scheduled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')
      ELSE to_char(a.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')
    END AS start_value,
    '/dashboard/assets/' || a.id AS href,
    a.id AS asset_id,
    NULL::text AS upload_queue_id,
    NULL::text AS platform,
    a.status AS status_value,
    NULL::text AS note,
    NULL::text AS caption_value,
    NULL::text AS contract_end_value
  FROM content_assets a
  LEFT JOIN clients c ON c.id = a.client_id
  WHERE a.created_by = $1
    AND a.status IN ('revision_requested', 'ready_for_review')
    AND (
      (a.publish_date IS NOT NULL AND a.publish_date BETWEEN ($2::date - interval '2 days') AND ($3::date + interval '2 days'))
      OR (a.scheduled_at IS NOT NULL AND a.scheduled_at BETWEEN $4::timestamptz AND $5::timestamptz)
      OR (a.created_at IS NOT NULL AND a.created_at BETWEEN $4::timestamptz AND $5::timestamptz)
    )
)
ORDER BY start_value ASC
`
}

const CALENDAR_QUERY = calendarQuery(false)
const CALENDAR_QUERY_WITH_DRAFTS = calendarQuery(true)

function mapRow(row: Record<string, unknown>): CalendarEvent {
  return {
    id: String(row.source_id),
    kind: row.kind as CalendarEvent["kind"],
    title: String(row.title),
    clientId: (row.client_id as string) ?? null,
    clientName: (row.client_name as string) ?? null,
    start: String(row.start_value),
    href: (row.href as string) ?? null,
    assetId: (row.asset_id as string) ?? null,
    uploadQueueId: (row.upload_queue_id as string) ?? null,
    platform: (row.platform as string) ?? null,
    status: (row.status_value as string) ?? null,
    note: (row.note as string) ?? null,
    caption: (row.caption_value as string) ?? null,
    contractEndDate: (row.contract_end_value as string) ?? null,
    recurrence: (row.recurrence as RecurrenceRule | null) ?? null,
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const url = new URL(request.url)
    const { start, end } = defaultMonthRange()
    const rangeStart = url.searchParams.get("start") ?? start
    const rangeEnd = url.searchParams.get("end") ?? end
    const includeDrafts = url.searchParams.get("includeDrafts") === "1"

    const windowStart = new Date(`${rangeStart}T00:00:00Z`).toISOString()
    const windowEnd = new Date(`${rangeEnd}T23:59:59Z`).toISOString()
    const windowStartDt = new Date(windowStart)
    const windowEndDt = new Date(windowEnd)

    const pool = getPool()
    const { rows } = await pool.query(
      includeDrafts ? CALENDAR_QUERY_WITH_DRAFTS : CALENDAR_QUERY,
      [user.id, rangeStart, rangeEnd, windowStart, windowEnd],
    )

    const data: CalendarEvent[] = rows.map(mapRow)
    const expanded = data.flatMap((ev) =>
      expandRecurrence(ev, windowStartDt, windowEndDt),
    )

    return NextResponse.json({ data: expanded })
  } catch (error) {
    logProductionRuntimeError("api-calendar-get", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
