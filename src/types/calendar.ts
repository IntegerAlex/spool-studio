export type CalendarEventKind = "publish" | "upload" | "contract" | "approval"

export type RecurrenceFreq = "daily" | "weekly" | "monthly"

export interface RecurrenceRule {
  freq: RecurrenceFreq
  interval?: number | null
  count?: number | null
  until?: string | null
}

export interface CalendarEvent {
  id: string
  kind: CalendarEventKind
  title: string
  clientId: string | null
  clientName: string | null
  start: string
  href: string | null
  assetId: string | null
  uploadQueueId: string | null
  platform: string | null
  status: string | null
  note: string | null
  caption: string | null
  contractEndDate: string | null
  recurrence?: RecurrenceRule | null
  occurrenceIndex?: number
  seriesId?: string
}

export interface CalendarRange {
  start: string
  end: string
}
