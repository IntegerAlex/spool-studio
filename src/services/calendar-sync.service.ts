import "server-only";

import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import { getAuthenticatedGoogleClient } from "@/integrations/google/tokens";
import type {
  CalendarDeleteResult,
  CalendarEventInput,
  CalendarEventResult,
  CalendarEventUpdateInput,
} from "@/integrations/google/types";
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics";

const PRIMARY_CALENDAR_ID = "primary";

function toReminders(input?: CalendarEventInput["reminders"]) {
  if (!input) {
    return undefined;
  }

  return {
    useDefault: input.useDefault ?? false,
    overrides: input.overrides?.map((override) => ({
      method: override.method,
      minutes: override.minutes,
    })),
  } satisfies calendar_v3.Schema$Event["reminders"];
}

function buildEventPayload(input: {
  title?: string;
  description?: string | null;
  startDateTime?: string;
  endDateTime?: string;
  reminders?: CalendarEventInput["reminders"];
}): calendar_v3.Schema$Event {
  const payload: calendar_v3.Schema$Event = {};

  if (input.title !== undefined) {
    payload.summary = input.title;
  }

  if (input.description !== undefined) {
    payload.description = input.description ?? "";
  }

  if (input.startDateTime && input.endDateTime) {
    payload.start = { dateTime: input.startDateTime };
    payload.end = { dateTime: input.endDateTime };
  }

  const reminders = toReminders(input.reminders);
  if (reminders) {
    payload.reminders = reminders;
  }

  return payload;
}

function mapEventResult(event: calendar_v3.Schema$Event): CalendarEventResult {
  const eventId = event.id;
  if (!eventId) {
    throw new Error("Google Calendar event id missing");
  }

  return {
    eventId,
    htmlLink: event.htmlLink ?? null,
    status: event.status ?? null,
  };
}

export async function createCalendarEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
  try {
    const auth = await getAuthenticatedGoogleClient(input.userId);
    const calendar = google.calendar({ version: "v3", auth });

    const payload = buildEventPayload({
      title: input.title,
      description: input.description,
      startDateTime: input.startDateTime,
      endDateTime: input.endDateTime,
      reminders: input.reminders,
    });

    const response = await calendar.events.insert({
      calendarId: PRIMARY_CALENDAR_ID,
      requestBody: payload,
    });

    if (!response.data) {
      throw new Error("Google Calendar create event failed");
    }

    return mapEventResult(response.data);
  } catch (error) {
    logProductionRuntimeError("google-calendar-create", error, { userId: input.userId });
    throw new Error("Failed to create calendar event");
  }
}

export async function updateCalendarEvent(
  input: CalendarEventUpdateInput
): Promise<CalendarEventResult> {
  if ((input.startDateTime && !input.endDateTime) || (!input.startDateTime && input.endDateTime)) {
    throw new Error("Calendar updates require both start and end times");
  }

  try {
    const auth = await getAuthenticatedGoogleClient(input.userId);
    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.events.patch({
      calendarId: PRIMARY_CALENDAR_ID,
      eventId: input.eventId,
      requestBody: buildEventPayload({
        title: input.title,
        description: input.description,
        startDateTime: input.startDateTime,
        endDateTime: input.endDateTime,
        reminders: input.reminders,
      }),
    });

    if (!response.data) {
      throw new Error("Google Calendar update event failed");
    }

    return mapEventResult(response.data);
  } catch (error) {
    logProductionRuntimeError("google-calendar-update", error, {
      userId: input.userId,
      eventId: input.eventId,
    });
    throw new Error("Failed to update calendar event");
  }
}

export async function deleteCalendarEvent(
  userId: string,
  eventId: string
): Promise<CalendarDeleteResult> {
  try {
    const auth = await getAuthenticatedGoogleClient(userId);
    const calendar = google.calendar({ version: "v3", auth });

    await calendar.events.delete({
      calendarId: PRIMARY_CALENDAR_ID,
      eventId,
    });

    return { deleted: true, status: "deleted" };
  } catch (error) {
    const maybe = error as { code?: number; status?: number };
    const status = maybe?.code ?? maybe?.status ?? null;

    if (status === 404) {
      return { deleted: false, status: "not_found" };
    }

    logProductionRuntimeError("google-calendar-delete", error, { userId, eventId });
    throw new Error("Failed to delete calendar event");
  }
}
