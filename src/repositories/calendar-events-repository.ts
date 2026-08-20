import { sql } from "drizzle-orm"
import { db } from "@/db"

export interface CalendarQueryArgs {
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
    AND a.status = ANY(${includeDrafts ? sql`ARRAY['approved','published','scheduled','draft','in_design']` : sql`ARRAY['approved','published','scheduled']`}::text[])
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
LIMIT 500
`
}

export interface CalendarEventRow {
  source_id: string | null
  kind: string | null
  title: string | null
  client_id: string | null
  client_name: string | null
  start_value: string | null
  href: string | null
  asset_id: string | null
  recurrence: unknown
  upload_queue_id: string | null
  platform: string | null
  status_value: string | null
  note: string | null
  caption_value: string | null
  contract_end_value: string | null
}

export async function listCalendarEvents(
  includeDrafts: boolean,
  args: CalendarQueryArgs,
): Promise<CalendarEventRow[]> {
  const { rows } = await db.execute(calendarQuery(includeDrafts, args))
  // SAFETY: db.execute returns loosely-typed rows; each field is coerced to the
  // concrete CalendarEventRow shape (null => null, otherwise string) here at the
  // I/O boundary before the route consumes it.
  return (rows ?? []).map((row) => ({
    source_id: row.source_id == null ? null : String(row.source_id),
    kind: row.kind == null ? null : String(row.kind),
    title: row.title == null ? null : String(row.title),
    client_id: row.client_id == null ? null : String(row.client_id),
    client_name: row.client_name == null ? null : String(row.client_name),
    start_value: row.start_value == null ? null : String(row.start_value),
    href: row.href == null ? null : String(row.href),
    asset_id: row.asset_id == null ? null : String(row.asset_id),
    recurrence: row.recurrence,
    upload_queue_id:
      row.upload_queue_id == null ? null : String(row.upload_queue_id),
    platform: row.platform == null ? null : String(row.platform),
    status_value: row.status_value == null ? null : String(row.status_value),
    note: row.note == null ? null : String(row.note),
    caption_value: row.caption_value == null ? null : String(row.caption_value),
    contract_end_value:
      row.contract_end_value == null ? null : String(row.contract_end_value),
  }))
}
