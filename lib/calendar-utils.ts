import type {
  CalendarEvent,
  CalendarEventKind,
  CalendarRange,
} from "@/types/calendar"

export function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function eventStart(event: CalendarEvent): Date {
  return new Date(event.start)
}

export function toFloatingLocalISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${formatDateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function eventStartString(kind: CalendarEventKind, date: Date): string {
  if (kind === "upload") return date.toISOString()
  if (kind === "contract") return formatDateKey(date)
  return toFloatingLocalISO(date)
}

export function isEventInRange(
  event: CalendarEvent,
  range: CalendarRange,
): boolean {
  const start = eventStart(event).getTime()
  const rangeStart = new Date(range.start).getTime()
  const rangeEnd = new Date(range.end).getTime()
  return start >= rangeStart && start <= rangeEnd
}

export function groupEventsByDay(
  events: CalendarEvent[],
): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const key = formatDateKey(eventStart(event))
    const bucket = grouped.get(key)
    if (bucket) {
      bucket.push(event)
    } else {
      grouped.set(key, [event])
    }
  }
  return grouped
}
