import type { CalendarEvent, CalendarEventKind } from "@/types/calendar"

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function toUTCBasic(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

function toICSDate(kind: CalendarEventKind, startISO: string): string {
  const d = new Date(startISO)
  if (kind === "upload") return toUTCBasic(d)
  if (kind === "contract") {
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  }
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function escapeICS(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")
}

export function eventsToICS(
  events: CalendarEvent[],
  opts?: { calName?: string },
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Libreonix//Calendar//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeICS(opts?.calName ?? "Libreonix Calendar")}`,
  ]

  const now = toUTCBasic(new Date())

  for (const event of events) {
    const startDate = new Date(event.start)
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
    const description = [event.clientName, event.platform, event.kind]
      .filter(Boolean)
      .join(" · ")

    lines.push("BEGIN:VEVENT")
    lines.push(`UID:${event.id}@libreonix`)
    lines.push(`DTSTAMP:${now}`)
    lines.push(`DTSTART:${toICSDate(event.kind, event.start)}`)
    lines.push(`DTEND:${toICSDate(event.kind, endDate.toISOString())}`)
    lines.push(`SUMMARY:${escapeICS(event.title)}`)
    if (description) lines.push(`DESCRIPTION:${escapeICS(description)}`)
    lines.push(`CATEGORIES:${event.kind}`)
    lines.push("END:VEVENT")
  }

  lines.push("END:VCALENDAR")
  return lines.join("\r\n")
}

export function downloadICS(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
