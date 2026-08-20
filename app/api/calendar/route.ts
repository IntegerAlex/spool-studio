import { sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { requireUser } from "@/lib/auth"
import { expandRecurrence } from "@/lib/calendar-recurrence"
import { formatDateKey } from "@/lib/calendar-utils"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import type { CalendarEvent, RecurrenceRule } from "@/types/calendar"

function defaultMonthRange() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    start: formatDateKey(first),
    end: formatDateKey(last),
  } satisfies { start: string; end: string }
}

interface CalendarQueryArgs {
  userId: string
  rangeStart: string
  rangeEnd: string
  windowStart: string
  windowEnd: string
}

function calendarQuery(
  includeDrafts: boolean,
  { userId, rangeStart, rangeEnd, windowStart, windowEnd }: CalendarQueryArgs,
) {
  const publishStatuses = includeDrafts
    ? "'approved', 'published', 'scheduled', 'draft', 'in_design'"
    : "'approved', 'published', 'scheduled'"
  return sql`
(
  SELECT
    a.id::text AS source_id,
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
    NULL::uuid AS upload_queue_id,
    NULL::text AS platform,
    a.status::text AS status_value,
    NULL::text AS note,
    NULL::text AS caption_value,
    NULL::text AS contract_end_value
  FROM content_assets a
  LEFT JOIN clients c ON c.id = a.client_id
  WHERE a.created_by = ${userId}
    AND a.status IN (${sql.raw(publishStatuses)})
    AND (
      (a.publish_date IS NOT NULL AND a.publish_date BETWEEN (${rangeStart}::date - interval '2 days') AND (${rangeEnd}::date + interval '2 days'))
      OR (a.scheduled_at IS NOT NULL AND a.scheduled_at BETWEEN ${windowStart}::timestamptz AND ${windowEnd}::timestamptz)
      OR (a.published_at IS NOT NULL AND a.published_at BETWEEN ${windowStart}::timestamptz AND ${windowEnd}::timestamptz)
      OR a.recurrence IS NOT NULL
    )
)
UNION ALL
(
  SELECT
    q.id::text AS source_id,
    'upload' AS kind,
    COALESCE(a.title, 'Upload') AS title,
    a.client_id AS client_id,
    c.name AS client_name,
    to_char(q.scheduled_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS start_value,
    '/dashboard/assets/' || a.id AS href,
    a.id AS asset_id,
    q.recurrence AS recurrence,
    q.id AS upload_queue_id,
    q.platform AS platform,
    q.status AS status_value,
    NULL::text AS note,
    q.caption AS caption_value,
    NULL::text AS contract_end_value
  FROM upload_queue q
  JOIN content_assets a ON a.id = q.asset_id
  LEFT JOIN clients c ON c.id = a.client_id
  WHERE a.created_by = ${userId}
    AND q.scheduled_date IS NOT NULL
    AND (q.scheduled_date BETWEEN ${windowStart}::timestamptz AND ${windowEnd}::timestamptz OR q.recurrence IS NOT NULL)
)
UNION ALL
(
  SELECT
    ('contract-' || c.id::text) AS source_id,
    'contract' AS kind,
    (c.name || ' contract') AS title,
    c.id AS client_id,
    c.name AS client_name,
    c.contract_start_date::text AS start_value,
    '/dashboard/clients/' || c.id AS href,
    NULL::uuid AS asset_id,
    NULL::jsonb AS recurrence,
    NULL::uuid AS upload_queue_id,
    NULL::text AS platform,
    NULL::text AS status_value,
    NULL::text AS note,
    NULL::text AS caption_value,
    c.contract_end_date::text AS contract_end_value
  FROM clients c
  WHERE c.created_by = ${userId}
    AND c.contract_start_date IS NOT NULL
    AND c.contract_start_date BETWEEN (${rangeStart}::date - interval '2 days') AND (${rangeEnd}::date + interval '2 days')
)
UNION ALL
(
  SELECT
    a.id::text AS source_id,
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
    NULL::jsonb AS recurrence,
    NULL::uuid AS upload_queue_id,
    NULL::text AS platform,
    a.status::text AS status_value,
    NULL::text AS note,
    NULL::text AS caption_value,
    NULL::text AS contract_end_value
  FROM content_assets a
  LEFT JOIN clients c ON c.id = a.client_id
  WHERE a.created_by = ${userId}
    AND a.status IN ('revision_requested', 'ready_for_review')
    AND (
      (a.publish_date IS NOT NULL AND a.publish_date BETWEEN (${rangeStart}::date - interval '2 days') AND (${rangeEnd}::date + interval '2 days'))
      OR (a.scheduled_at IS NOT NULL AND a.scheduled_at BETWEEN ${windowStart}::timestamptz AND ${windowEnd}::timestamptz)
      OR (a.created_at IS NOT NULL AND a.created_at BETWEEN ${windowStart}::timestamptz AND ${windowEnd}::timestamptz)
    )
)
ORDER BY start_value ASC
`
}

// oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type  // dynamic external payload
function mapRow(row: Record<string, unknown>): CalendarEvent {
  return {
    id: String(row.source_id),
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    kind: row.kind as CalendarEvent["kind"],
    title: String(row.title),
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    clientId: (row.client_id as string) ?? null,
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    clientName: (row.client_name as string) ?? null,
    start: String(row.start_value),
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    href: (row.href as string) ?? null,
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    assetId: (row.asset_id as string) ?? null,
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    uploadQueueId: (row.upload_queue_id as string) ?? null,
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    platform: (row.platform as string) ?? null,
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    status: (row.status_value as string) ?? null,
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    note: (row.note as string) ?? null,
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    caption: (row.caption_value as string) ?? null,
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    contractEndDate: (row.contract_end_value as string) ?? null,
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
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

    const { rows } = await db.execute(
      calendarQuery(includeDrafts, {
        userId: user.id,
        rangeStart,
        rangeEnd,
        windowStart,
        windowEnd,
      }),
    )

    const data: CalendarEvent[] = (rows ?? []).map(mapRow)
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
