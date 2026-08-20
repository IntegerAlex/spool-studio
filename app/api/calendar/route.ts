import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { expandRecurrence } from "@/lib/calendar-recurrence"
import { formatDateKey } from "@/lib/calendar-utils"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  listCalendarEvents,
  type CalendarEventRow,
} from "@/repositories/calendar-events-repository"
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

function mapRow(row: CalendarEventRow): CalendarEvent {
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

    const rows = await listCalendarEvents(includeDrafts, {
      userId: user.id,
      rangeStart,
      rangeEnd,
      windowStart,
      windowEnd,
    })

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
