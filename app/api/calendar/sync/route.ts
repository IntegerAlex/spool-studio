import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createCalendarEvent } from "@/services/calendar-sync.service";
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics";
import { getAssetById, updateAsset } from "@/repositories/assets-repository";
import type { CalendarReminderInput } from "@/integrations/google/types";

export const runtime = "nodejs";

const DEFAULT_EVENT_DURATION_MINUTES = 30;

type SyncRequestBody = {
  assetId?: string;
  description?: string | null;
  reminders?: CalendarReminderInput;
};

function buildPublishDateTime(publishDate: string, publishTime?: string | null) {
  const timePart = publishTime ?? "00:00:00";
  const combined = `${publishDate}T${timePart}`;
  const start = new Date(combined);

  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const end = new Date(start.getTime() + DEFAULT_EVENT_DURATION_MINUTES * 60 * 1000);

  return {
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as SyncRequestBody;
    const assetId = body.assetId?.trim();

    if (!assetId) {
      return NextResponse.json({ error: "assetId is required" }, { status: 400 });
    }

    const asset = await getAssetById(assetId, supabase);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    if (asset.status !== "approved") {
      return NextResponse.json({ error: "Asset must be approved" }, { status: 409 });
    }

    if (!asset.publish_date) {
      return NextResponse.json({ error: "Asset publish date is required" }, { status: 409 });
    }

    if (asset.google_calendar_event_id) {
      return NextResponse.json(
        {
          status: "already_synced",
          eventId: asset.google_calendar_event_id,
          eventUrl: asset.google_calendar_event_url,
        },
        { status: 200 }
      );
    }

    const schedule = buildPublishDateTime(asset.publish_date, asset.publish_time);
    if (!schedule) {
      return NextResponse.json({ error: "Invalid publish date/time" }, { status: 400 });
    }

    const event = await createCalendarEvent({
      userId: user.id,
      title: asset.title,
      description: body.description ?? undefined,
      startDateTime: schedule.startDateTime,
      endDateTime: schedule.endDateTime,
      reminders: body.reminders,
    });

    const syncedAt = new Date().toISOString();

    const updated = await updateAsset(
      assetId,
      {
        google_calendar_event_id: event.eventId,
        google_calendar_event_url: event.htmlLink,
        calendar_synced_at: syncedAt,
      },
      supabase
    );

    return NextResponse.json({
      status: "synced",
      eventId: updated.google_calendar_event_id,
      eventUrl: updated.google_calendar_event_url,
      syncedAt: updated.calendar_synced_at,
    });
  } catch (error) {
    logProductionRuntimeError("calendar-sync", error);
    return NextResponse.json({ error: "Calendar sync failed" }, { status: 500 });
  }
}
