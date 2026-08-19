"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  Calendar as CalIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
} from "lucide-react"
import Link from "next/link"
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  type CalendarClientOption,
  CalendarFilters,
} from "@/components/calendar/calendar-filters"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import ErrorBoundary from "@/components/ui/error-boundary"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"
import { assetsApi, calendarApi, clientsApi } from "@/lib/api-client"
import { downloadICS, eventsToICS } from "@/lib/calendar-ics"
import {
  eventStart,
  eventStartString,
  formatDateKey,
  groupEventsByDay,
} from "@/lib/calendar-utils"
import { cn } from "@/lib/utils"
import type {
  Asset,
  CalendarEvent,
  CalendarEventKind,
  Client,
  RecurrenceFreq,
  RecurrenceRule,
} from "@/types/index"

type ViewMode = "month" | "week" | "day"

const FALLBACK_PALETTE = [
  "#10b981",
  "#38bdf8",
  "#f59e0b",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#fb7185",
  "#60a5fa",
]

function clientColor(
  clientId: string | null,
  clientsById: Map<string, CalendarClientOption>,
): string {
  if (clientId) {
    const c = clientsById.get(clientId)
    if (c?.brandColor) return c.brandColor
  }
  const s = clientId ?? "x"
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return FALLBACK_PALETTE[h % FALLBACK_PALETTE.length]
}

function assignLanes(events: CalendarEvent[]): Map<string, number> {
  const sorted = [...events].sort(
    (a, b) => eventStart(a).getTime() - eventStart(b).getTime(),
  )
  const laneEnds: number[] = []
  const lanes = new Map<string, number>()
  const DURATION = 60
  for (const e of sorted) {
    const startMin = eventStart(e).getHours() * 60 + eventStart(e).getMinutes()
    let lane = laneEnds.findIndex((end) => end <= startMin)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(startMin + DURATION)
    } else {
      laneEnds[lane] = startMin + DURATION
    }
    lanes.set(e.id, lane)
  }
  return lanes
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday)
    dt.setDate(monday.getDate() + i)
    return dt
  })
}

function getHours(): number[] {
  return Array.from({ length: 24 }, (_, i) => i)
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
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

const KIND_LABEL: Record<CalendarEventKind, string> = {
  publish: "Publish",
  upload: "Upload",
  contract: "Contract",
  approval: "Approval",
}

const KIND_STYLES: Record<CalendarEventKind, string> = {
  publish: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300",
  upload: "bg-sky-500/10 border border-sky-500/20 text-sky-300",
  contract: "bg-amber-500/10 border border-amber-500/20 text-amber-300",
  approval: "bg-violet-500/10 border border-violet-500/20 text-violet-300",
}

const PLATFORMS = [
  "instagram",
  "facebook",
  "youtube",
  "tiktok",
  "linkedin",
  "twitter",
  "threads",
]

function KindBadge({ kind }: { kind: CalendarEventKind }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium",
        KIND_STYLES[kind],
      )}
    >
      {KIND_LABEL[kind]}
    </span>
  )
}

function formatEventTime(event: CalendarEvent): string {
  const date = eventStart(event)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatEventDate(event: CalendarEvent): string {
  const date = eventStart(event)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function computeNewStart(
  event: CalendarEvent,
  target: { date: Date; hour?: number },
): Date {
  const orig = eventStart(event)
  const hour = target.hour ?? orig.getHours()
  return new Date(
    target.date.getFullYear(),
    target.date.getMonth(),
    target.date.getDate(),
    hour,
    orig.getMinutes(),
    0,
    0,
  )
}

export default function CalendarPage() {
  const { toast } = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [clients, setClients] = useState<CalendarClientOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [composerStart, setComposerStart] = useState<Date | null>(null)
  const [jumpOpen, setJumpOpen] = useState(false)
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [enabledKinds, setEnabledKinds] = useState<CalendarEventKind[]>([
    "publish",
    "upload",
    "contract",
    "approval",
  ])
  const [includeDrafts, setIncludeDrafts] = useState(false)
  const draggedEventId = useRef<string | null>(null)

  const clientsById = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  )

  const loadData = useCallback(async (drafts: boolean) => {
    const data = await calendarApi.getMany(undefined, { includeDrafts: drafts })
    setEvents(data)
  }, [])

  useEffect(() => {
    let active = true
    setIsLoading(true)
    Promise.all([
      loadData(includeDrafts),
      clientsApi.getAll().then((list: Client[]) =>
        list.map((c) => ({
          id: c.id,
          name: c.name,
          brandColor: c.brandColor,
        })),
      ),
    ])
      .then(([, clientOpts]) => {
        if (active) setClients(clientOpts)
      })
      .catch(() => {
        toast({ title: "Failed to load calendar", variant: "destructive" })
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [loadData, includeDrafts, toast])

  const visibleEvents = useMemo(
    () =>
      events.filter(
        (e) =>
          (selectedClientIds.length === 0 ||
            (e.clientId != null && selectedClientIds.includes(e.clientId))) &&
          enabledKinds.includes(e.kind),
      ),
    [events, selectedClientIds, enabledKinds],
  )

  const eventsByDay = useMemo(
    () => groupEventsByDay(visibleEvents),
    [visibleEvents],
  )

  const getEventsForDate = useCallback(
    (date: Date) => eventsByDay.get(formatDateKey(date)) ?? [],
    [eventsByDay],
  )

  const getEventsForHour = useCallback(
    (date: Date, hour: number) => {
      const dateStr = formatDateKey(date)
      return visibleEvents.filter((event) => {
        const start = eventStart(event)
        if (Number.isNaN(start.getTime())) return false
        return formatDateKey(start) === dateStr && start.getHours() === hour
      })
    },
    [visibleEvents],
  )

  const handleReschedule = useCallback(
    async (event: CalendarEvent, newStart: Date) => {
      const optimisticStart = eventStartString(event.kind, newStart)
      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id ? { ...e, start: optimisticStart } : e,
        ),
      )
      try {
        await calendarApi.reschedule(event, newStart)
        await loadData(includeDrafts)
      } catch (err) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === event.id ? { ...e, start: event.start } : e,
          ),
        )
        toast({
          title: "Could not reschedule",
          description: err instanceof Error ? err.message : "Please try again",
          variant: "destructive",
        })
      }
    },
    [loadData, includeDrafts, toast],
  )

  const handleDrop = useCallback(
    (target: { date: Date; hour?: number }) => {
      const id = draggedEventId.current
      draggedEventId.current = null
      if (!id) return
      const event = events.find((e) => e.id === id)
      if (!event) return
      handleReschedule(event, computeNewStart(event, target))
    },
    [events, handleReschedule],
  )

  const openComposer = useCallback((date: Date, hour?: number) => {
    const start =
      hour !== undefined
        ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0)
        : new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0)
    setComposerStart(start)
  }, [])

  const navigatePrev = () => {
    if (viewMode === "month")
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
      )
    else if (viewMode === "week") {
      const d = new Date(currentDate)
      d.setDate(d.getDate() - 7)
      setCurrentDate(d)
    } else {
      const d = new Date(currentDate)
      d.setDate(d.getDate() - 1)
      setCurrentDate(d)
    }
  }

  const navigateNext = () => {
    if (viewMode === "month")
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
      )
    else if (viewMode === "week") {
      const d = new Date(currentDate)
      d.setDate(d.getDate() + 7)
      setCurrentDate(d)
    } else {
      const d = new Date(currentDate)
      d.setDate(d.getDate() + 1)
      setCurrentDate(d)
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const headerLabel = useMemo(() => {
    if (viewMode === "month")
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    if (viewMode === "week") {
      const dates = getWeekDates(currentDate)
      const start = dates[0]
      const end = dates[6]
      if (start.getMonth() === end.getMonth())
        return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`
      return `${MONTH_NAMES[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`
    }
    return currentDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }, [currentDate, viewMode])

  const upcomingApproved = useMemo(
    () =>
      visibleEvents
        .filter((e) => e.kind === "publish" && e.status === "approved")
        .sort((a, b) => eventStart(a).getTime() - eventStart(b).getTime())
        .slice(0, 8),
    [visibleEvents],
  )
  const publishedHistory = useMemo(
    () =>
      visibleEvents
        .filter((e) => e.kind === "publish" && e.status === "published")
        .sort((a, b) => eventStart(b).getTime() - eventStart(a).getTime())
        .slice(0, 8),
    [visibleEvents],
  )

  const handleExport = () => {
    if (visibleEvents.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Adjust filters to include events.",
      })
      return
    }
    downloadICS(
      `calendar-${formatDateKey(new Date())}.ics`,
      eventsToICS(visibleEvents),
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Calendar" },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div
        className="space-y-6"
        style={{
          backgroundColor: "var(--color-bg-app)",
          minHeight: "100vh",
          margin: "-24px",
          padding: "32px",
        }}
      >
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Calendar" },
          ]}
        />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Calendar
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Plan and schedule your deliverable publications
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-8 px-3 text-xs border-white/10 bg-transparent text-zinc-300 hover:bg-white/5"
            >
              Today
            </Button>
            <Popover open={jumpOpen} onOpenChange={setJumpOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs border-white/10 bg-transparent text-zinc-300 hover:bg-white/5"
                >
                  <CalIcon className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto bg-[#161616] border-white/10 p-0">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={(d) => {
                    if (d) {
                      setCurrentDate(d)
                      setJumpOpen(false)
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-8 px-3 text-xs border-white/10 bg-transparent text-zinc-300 hover:bg-white/5"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <div className="inline-flex rounded-md border border-white/10 bg-[#161616] p-0.5">
              {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "h-7 rounded-[5px] px-3 text-[11px] font-medium transition-all",
                    viewMode === mode
                      ? "bg-white/10 text-white"
                      : "text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center rounded-md border border-white/10 bg-[#161616] p-0.5">
              <button
                type="button"
                onClick={navigatePrev}
                className="h-7 w-7 flex items-center justify-center rounded-[5px] text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-medium text-white min-w-[140px] text-center">
                {headerLabel}
              </span>
              <button
                type="button"
                onClick={navigateNext}
                className="h-7 w-7 flex items-center justify-center rounded-[5px] text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <CalendarFilters
          clients={clients}
          selectedClientIds={selectedClientIds}
          onSelectedClientIdsChange={setSelectedClientIds}
          enabledKinds={enabledKinds}
          onEnabledKindsChange={setEnabledKinds}
          includeDrafts={includeDrafts}
          onIncludeDraftsChange={setIncludeDrafts}
        />

        <p className="text-[11px] text-zinc-500">
          Drag events to reschedule · click <Plus className="inline h-3 w-3" />{" "}
          to schedule.
        </p>

        {visibleEvents.length === 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-[var(--color-bg-surface)] p-6 text-center">
            <p className="text-sm text-zinc-400">
              {events.length === 0
                ? "No events yet. Click the + on any day to schedule one."
                : "No events match your filters."}
            </p>
            {events.length > 0 && (
              <p className="text-[12px] text-zinc-600 mt-1">
                Try enabling more categories or clearing client filters.
              </p>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 items-start">
          <div className="xl:col-span-2">
            <AnimatePresence mode="wait">
              {viewMode === "month" && (
                <motion.div
                  key="month"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <MonthView
                    currentDate={currentDate}
                    getEventsForDate={getEventsForDate}
                    events={events}
                    clientsById={clientsById}
                    onSelectDate={(d) => {
                      setViewMode("day")
                      setCurrentDate(d)
                    }}
                    onSelectEvent={setSelectedEvent}
                    onScheduleDate={openComposer}
                    onDropDate={handleDrop}
                    onDragStartEvent={(id) => {
                      draggedEventId.current = id
                    }}
                  />
                </motion.div>
              )}
              {viewMode === "week" && (
                <motion.div
                  key="week"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <WeekView
                    currentDate={currentDate}
                    getEventsForHour={getEventsForHour}
                    clientsById={clientsById}
                    onSelectEvent={setSelectedEvent}
                    onScheduleSlot={openComposer}
                    onDropSlot={handleDrop}
                    onDragStartEvent={(id) => {
                      draggedEventId.current = id
                    }}
                  />
                </motion.div>
              )}
              {viewMode === "day" && (
                <motion.div
                  key="day"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <DayView
                    currentDate={currentDate}
                    getEventsForHour={getEventsForHour}
                    clientsById={clientsById}
                    onSelectEvent={setSelectedEvent}
                    onScheduleSlot={openComposer}
                    onDropSlot={handleDrop}
                    onDragStartEvent={(id) => {
                      draggedEventId.current = id
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4">
            <SidePanel
              title="Upcoming Approved"
              items={upcomingApproved}
              onSelect={setSelectedEvent}
            />
            <SidePanel
              title="Published History"
              items={publishedHistory}
              onSelect={setSelectedEvent}
            />
          </div>
        </div>

        <AnimatePresence>
          {selectedEvent && (
            <EventDetailModal
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {composerStart && (
            <ScheduleComposer
              start={composerStart}
              onClose={() => setComposerStart(null)}
              onCreated={() => loadData(includeDrafts)}
            />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  )
}

function EventChip({
  event,
  clientsById,
  onSelect,
  onDragStart,
}: {
  event: CalendarEvent
  clientsById: Map<string, CalendarClientOption>
  onSelect: (e: CalendarEvent) => void
  onDragStart: (id: string) => void
}) {
  const color = clientColor(event.clientId, clientsById)
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move"
        onDragStart(event.id)
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(event)
      }}
      className="truncate rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-white/[0.08] cursor-grab active:cursor-grabbing"
      style={{ borderLeft: `3px solid ${color}` }}
      title={`${event.title} — drag to reschedule`}
    >
      {event.title}
    </div>
  )
}

function MonthView({
  currentDate,
  getEventsForDate,
  events,
  clientsById,
  onSelectDate,
  onSelectEvent,
  onScheduleDate,
  onDropDate,
  onDragStartEvent,
}: {
  currentDate: Date
  getEventsForDate: (d: Date) => CalendarEvent[]
  events: CalendarEvent[]
  clientsById: Map<string, CalendarClientOption>
  onSelectDate: (d: Date) => void
  onSelectEvent: (e: CalendarEvent) => void
  onScheduleDate: (d: Date) => void
  onDropDate: (target: { date: Date }) => void
  onDragStartEvent: (id: string) => void
}) {
  const spanEvents = events.filter(
    (e) =>
      e.kind === "contract" &&
      e.contractEndDate != null &&
      e.contractEndDate !== e.start,
  )

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  ).getDate()
  const firstDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  ).getDay()
  const emptyDays = Array.from(
    { length: firstDay === 0 ? 6 : firstDay - 1 },
    (_, i) => i,
  )
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[var(--color-bg-surface)] overflow-hidden">
      <div className="grid grid-cols-7 bg-white/[0.02] border-b border-white/[0.06]">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest text-zinc-500"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {emptyDays.map((i) => (
          <div
            key={`empty-${i}`}
            className="min-h-[90px] border-b border-r border-white/[0.04] bg-white/[0.01]"
          />
        ))}
        {days.map((day) => {
          const date = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            day,
          )
          const dayEvents = getEventsForDate(date)
          const dayKey = formatDateKey(date)
          const isToday = dayKey === formatDateKey(new Date())
          const spanHere = spanEvents.filter(
            (e) => dayKey >= e.start && dayKey <= (e.contractEndDate as string),
          )
          const singleEvents = dayEvents.filter(
            (e) => !(e.kind === "contract" && e.contractEndDate != null),
          )

          return (
            <motion.div
              key={day}
              whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
              className={cn(
                "group relative min-h-[90px] border-b border-r border-white/[0.04] p-2 cursor-pointer transition-colors",
                isToday && "bg-emerald-500/[0.04]",
              )}
              onClick={() => onSelectDate(date)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                onDropDate({ date })
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onScheduleDate(date)
                }}
                className="absolute top-1 right-1 hidden h-5 w-5 items-center justify-center rounded bg-white/10 text-zinc-300 hover:bg-white/20 group-hover:flex"
                title="Schedule on this day"
              >
                <Plus className="h-3 w-3" />
              </button>
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium",
                  isToday ? "bg-emerald-500 text-white" : "text-zinc-400",
                )}
              >
                {day}
              </span>
              <div className="mt-1 space-y-1">
                {spanHere.map((event) => {
                  const isFirst = dayKey === event.start
                  const isLast = dayKey === event.contractEndDate
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectEvent(event)
                      }}
                      className={cn(
                        "flex h-5 items-center overflow-hidden rounded-[3px] border border-amber-500/30 bg-amber-500/15 px-1.5 text-[10px] font-medium text-amber-300",
                        isFirst
                          ? "rounded-l-[3px]"
                          : "rounded-l-none border-l-0",
                        isLast
                          ? "rounded-r-[3px]"
                          : "rounded-r-none border-r-0",
                      )}
                      title={event.title}
                    >
                      {isFirst && (
                        <span className="truncate">{event.title}</span>
                      )}
                    </div>
                  )
                })}
                {singleEvents.slice(0, 3).map((event) => (
                  <EventChip
                    key={event.id}
                    event={event}
                    clientsById={clientsById}
                    onSelect={onSelectEvent}
                    onDragStart={onDragStartEvent}
                  />
                ))}
                {singleEvents.length > 3 && (
                  <p className="text-[9px] text-zinc-500 pl-1">
                    +{singleEvents.length - 3} more
                  </p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function HourSlot({
  events,
  date,
  hour,
  clientsById,
  onSelectEvent,
  onScheduleSlot,
  onDropSlot,
  onDragStartEvent,
}: {
  events: CalendarEvent[]
  date: Date
  hour: number
  clientsById: Map<string, CalendarClientOption>
  onSelectEvent: (e: CalendarEvent) => void
  onScheduleSlot: (d: Date, h: number) => void
  onDropSlot: (target: { date: Date; hour: number }) => void
  onDragStartEvent: (id: string) => void
}) {
  const lanes = assignLanes(events)
  const laneCount = Math.max(1, ...[...lanes.values()].map((l) => l + 1))
  const MAX_LANES = 3
  const shown = events.filter((e) => (lanes.get(e.id) ?? 0) < MAX_LANES)
  const overflow = events.length - shown.length

  return (
    <div
      className="group relative border-b border-l border-white/[0.04] min-h-[48px] p-1 hover:bg-white/[0.02] transition-colors cursor-pointer"
      onClick={() => onScheduleSlot(date, hour)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onDropSlot({ date, hour })
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onScheduleSlot(date, hour)
        }}
        className="absolute right-1 top-1 hidden h-4 w-4 items-center justify-center rounded bg-white/10 text-zinc-300 hover:bg-white/20 group-hover:flex"
        title="Schedule at this time"
      >
        <Plus className="h-3 w-3" />
      </button>
      <div
        className="flex flex-col gap-1"
        style={{
          display: shown.length ? "grid" : "block",
          gridTemplateColumns: `repeat(${Math.min(laneCount, MAX_LANES)}, 1fr)`,
        }}
      >
        {shown.map((event) => {
          const color = clientColor(event.clientId, clientsById)
          return (
            <div
              key={event.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move"
                onDragStartEvent(event.id)
              }}
              onClick={(e) => {
                e.stopPropagation()
                onSelectEvent(event)
              }}
              className="truncate rounded px-1.5 py-0.5 text-[9px] font-medium cursor-grab active:cursor-grabbing bg-white/[0.06] text-zinc-200"
              style={{ borderLeft: `3px solid ${color}` }}
              title={`${event.title} — drag to reschedule`}
            >
              {event.title}
            </div>
          )
        })}
        {overflow > 0 && (
          <p className="text-[9px] text-zinc-500">+{overflow} more</p>
        )}
      </div>
    </div>
  )
}

function WeekView({
  currentDate,
  getEventsForHour,
  clientsById,
  onSelectEvent,
  onScheduleSlot,
  onDropSlot,
  onDragStartEvent,
}: {
  currentDate: Date
  getEventsForHour: (d: Date, h: number) => CalendarEvent[]
  clientsById: Map<string, CalendarClientOption>
  onSelectEvent: (e: CalendarEvent) => void
  onScheduleSlot: (d: Date, h: number) => void
  onDropSlot: (target: { date: Date; hour: number }) => void
  onDragStartEvent: (id: string) => void
}) {
  const weekDates = getWeekDates(currentDate)
  const hours = getHours()
  const todayKey = formatDateKey(new Date())

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[var(--color-bg-surface)] overflow-hidden">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-white/[0.06] bg-white/[0.02]">
        <div className="py-2" />
        {weekDates.map((date, i) => {
          const isToday = formatDateKey(date) === todayKey
          return (
            <div
              key={formatDateKey(date)}
              className={cn(
                "py-2 px-1 text-center border-l border-white/[0.04]",
                isToday && "bg-emerald-500/[0.06]",
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {DAY_NAMES[i]}
              </p>
              <p
                className={cn(
                  "text-lg font-bold",
                  isToday ? "text-emerald-400" : "text-white",
                )}
              >
                {date.getDate()}
              </p>
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-[60px_repeat(7,1fr)] max-h-[600px] overflow-y-auto">
        {hours.map((hour) => (
          <div key={hour} className="contents">
            <div className="border-b border-white/[0.04] py-2 px-2 text-right">
              <span className="text-[10px] text-zinc-500 font-medium">
                {hour === 0
                  ? "12 AM"
                  : hour < 12
                    ? `${hour} AM`
                    : hour === 12
                      ? "12 PM"
                      : `${hour - 12} PM`}
              </span>
            </div>
            {weekDates.map((date) => (
              <HourSlot
                key={formatDateKey(date)}
                events={getEventsForHour(date, hour)}
                date={date}
                hour={hour}
                clientsById={clientsById}
                onSelectEvent={onSelectEvent}
                onScheduleSlot={onScheduleSlot}
                onDropSlot={onDropSlot}
                onDragStartEvent={onDragStartEvent}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function DayView({
  currentDate,
  getEventsForHour,
  clientsById,
  onSelectEvent,
  onScheduleSlot,
  onDropSlot,
  onDragStartEvent,
}: {
  currentDate: Date
  getEventsForHour: (d: Date, h: number) => CalendarEvent[]
  clientsById: Map<string, CalendarClientOption>
  onSelectEvent: (e: CalendarEvent) => void
  onScheduleSlot: (d: Date, h: number) => void
  onDropSlot: (target: { date: Date; hour: number }) => void
  onDragStartEvent: (id: string) => void
}) {
  const hours = getHours()
  const isToday = formatDateKey(currentDate) === formatDateKey(new Date())

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[var(--color-bg-surface)] overflow-hidden">
      <div
        className={cn(
          "border-b border-white/[0.06] py-3 px-4",
          isToday && "bg-emerald-500/[0.04]",
        )}
      >
        <p className="text-sm font-semibold text-white">
          {currentDate.toLocaleDateString("en-US", { weekday: "long" })}
        </p>
        <p className="text-xs text-zinc-400">
          {currentDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
      <div className="max-h-[600px] overflow-y-auto">
        {hours.map((hour) => {
          const hourEvents = getEventsForHour(currentDate, hour)
          const lanes = assignLanes(hourEvents)
          const laneCount = Math.max(
            1,
            ...[...lanes.values()].map((l) => l + 1),
          )
          const MAX_LANES = 3
          const shown = hourEvents.filter(
            (e) => (lanes.get(e.id) ?? 0) < MAX_LANES,
          )
          const overflow = hourEvents.length - shown.length
          return (
            <div
              key={hour}
              className="grid grid-cols-[70px_1fr] border-b border-white/[0.04] min-h-[56px]"
            >
              <div className="py-3 px-3 text-right border-r border-white/[0.04]">
                <span className="text-[11px] text-zinc-500 font-medium">
                  {hour === 0
                    ? "12 AM"
                    : hour < 12
                      ? `${hour} AM`
                      : hour === 12
                        ? "12 PM"
                        : `${hour - 12} PM`}
                </span>
              </div>
              <div
                className="group relative p-2 hover:bg-white/[0.02] transition-colors space-y-1 cursor-pointer"
                onClick={() => onScheduleSlot(currentDate, hour)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  onDropSlot({ date: currentDate, hour })
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onScheduleSlot(currentDate, hour)
                  }}
                  className="absolute right-2 top-2 hidden h-5 w-5 items-center justify-center rounded bg-white/10 text-zinc-300 hover:bg-white/20 group-hover:flex"
                  title="Schedule at this time"
                >
                  <Plus className="h-3 w-3" />
                </button>
                {hourEvents.length > 0 ? (
                  <div
                    className="flex flex-col gap-1"
                    style={{
                      display: shown.length ? "grid" : "block",
                      gridTemplateColumns: `repeat(${Math.min(laneCount, MAX_LANES)}, 1fr)`,
                    }}
                  >
                    {shown.map((event) => {
                      const color = clientColor(event.clientId, clientsById)
                      return (
                        <div
                          key={event.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move"
                            onDragStartEvent(event.id)
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectEvent(event)
                          }}
                          className="flex items-center gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-emerald-500/20 transition-colors"
                          style={{ borderLeft: `4px solid ${color}` }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">
                              {event.title}
                            </p>
                            <p className="text-[11px] text-zinc-400">
                              {event.clientName ?? "Unknown client"}
                            </p>
                          </div>
                          <KindBadge kind={event.kind} />
                        </div>
                      )
                    })}
                    {overflow > 0 && (
                      <p className="text-[10px] text-zinc-500">
                        +{overflow} more
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="h-full min-h-[40px]" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SidePanel({
  title,
  items,
  onSelect,
}: {
  title: string
  items: CalendarEvent[]
  onSelect: (e: CalendarEvent) => void
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[var(--color-bg-surface)] p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-3">
        {title}
      </h3>
      <div className="space-y-2">
        {items.length > 0 ? (
          items.map((event) => (
            <motion.div
              key={event.id}
              whileHover={{ x: 2, backgroundColor: "rgba(255,255,255,0.03)" }}
              onClick={() => onSelect(event)}
              className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] px-3 py-2.5 cursor-pointer transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-white truncate">
                  {event.title}
                </p>
                <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                  {event.clientName ?? "Unknown"} ·{" "}
                  {formatEventDate(event) || "No date"}
                </p>
              </div>
              <KindBadge kind={event.kind} />
            </motion.div>
          ))
        ) : (
          <p className="text-[12px] text-zinc-500 py-4 text-center">No items</p>
        )}
      </div>
    </div>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <div className="text-sm text-white mt-1">{children}</div>
    </div>
  )
}

function EventDetailModal({
  event,
  onClose,
}: {
  event: CalendarEvent
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#161616] shadow-2xl overflow-hidden"
      >
        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <KindBadge kind={event.kind} />
              {event.platform && (
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {event.platform}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white">{event.title}</h2>
            <p className="text-sm text-zinc-400 mt-1">
              {event.clientName ?? "Unknown client"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DetailRow label="Status">
              {event.status
                ? event.status.replace(/_/g, " ")
                : KIND_LABEL[event.kind]}
            </DetailRow>
            <DetailRow label="Date">{formatEventDate(event)}</DetailRow>
            <DetailRow label="Time">
              {formatEventTime(event) || "All day"}
            </DetailRow>
            <DetailRow label="Type">{KIND_LABEL[event.kind]}</DetailRow>
            {event.kind === "upload" && event.caption && (
              <div className="col-span-2">
                <DetailRow label="Caption">{event.caption}</DetailRow>
              </div>
            )}
            {event.kind === "contract" && event.contractEndDate && (
              <DetailRow label="Contract End">
                {event.contractEndDate}
              </DetailRow>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            {event.href && (
              <Link href={event.href} className="flex-1">
                <Button variant="accent" className="w-full h-9 text-xs">
                  Open
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              onClick={onClose}
              className="h-9 text-xs border-white/10 bg-transparent text-zinc-300"
            >
              Close
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ScheduleComposer({
  start,
  onClose,
  onCreated,
}: {
  start: Date
  onClose: () => void
  onCreated: () => void
}) {
  const { toast } = useToast()
  const [assets, setAssets] = useState<Asset[]>([])
  const [mode, setMode] = useState<"upload" | "publish">("upload")
  const [assetId, setAssetId] = useState("")
  const [platform, setPlatform] = useState(PLATFORMS[0])
  const [datetime, setDatetime] = useState(toLocalInputValue(start))
  const [repeat, setRepeat] = useState<"none" | RecurrenceFreq>("none")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let active = true
    assetsApi
      .getAll()
      .then((data) => {
        if (active) setAssets(data)
      })
      .catch(() => {
        /* non-blocking */
      })
    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!assetId) {
      toast({ title: "Select an asset", variant: "destructive" })
      return
    }
    const when = new Date(datetime)
    if (Number.isNaN(when.getTime())) {
      toast({ title: "Invalid date/time", variant: "destructive" })
      return
    }
    const recurrence: RecurrenceRule | null =
      repeat === "none" ? null : { freq: repeat }
    setIsSaving(true)
    try {
      if (mode === "upload") {
        await calendarApi.createUpload({
          assetId,
          platform,
          start: when,
          recurrence,
        })
      } else {
        await calendarApi.createPublish({
          assetId,
          start: when,
          recurrence,
        })
      }
      toast({
        title: mode === "upload" ? "Upload scheduled" : "Publish scheduled",
      })
      onCreated()
      onClose()
    } catch (err) {
      toast({
        title: "Could not schedule",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#161616] shadow-2xl overflow-hidden"
      >
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Schedule</h2>
            <div className="inline-flex rounded-md border border-white/10 bg-[#0f0f0f] p-0.5">
              {(["upload", "publish"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "h-7 rounded-[5px] px-3 text-[11px] font-medium transition-all",
                    mode === m
                      ? "bg-white/10 text-white"
                      : "text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  {m === "upload" ? "Upload" : "Publish"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="schedule-asset"
              className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
            >
              Asset
            </label>
            <select
              id="schedule-asset"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white"
            >
              <option value="">Select an asset…</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>

          {mode === "upload" && (
            <div>
              <label
                htmlFor="schedule-platform"
                className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
              >
                Platform
              </label>
              <select
                id="schedule-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="schedule-datetime"
              className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
            >
              Date &amp; time
            </label>
            <input
              id="schedule-datetime"
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label
              htmlFor="schedule-repeat"
              className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
            >
              Repeat
            </label>
            <select
              id="schedule-repeat"
              value={repeat}
              onChange={(e) =>
                setRepeat(e.target.value as "none" | RecurrenceFreq)
              }
              className="mt-1 w-full rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white"
            >
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              variant="accent"
              disabled={isSaving}
              className="flex-1 h-9 text-xs"
            >
              {isSaving ? "Scheduling…" : "Schedule"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 text-xs border-white/10 bg-transparent text-zinc-300"
            >
              Cancel
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
