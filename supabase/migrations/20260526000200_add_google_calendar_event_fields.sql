-- Add Google Calendar linkage fields to content_assets; additive and nullable for safe migration.
alter table if exists public.content_assets
  add column if not exists google_calendar_event_id text,
  add column if not exists google_calendar_event_url text,
  add column if not exists calendar_synced_at timestamptz;

create index if not exists content_assets_google_calendar_event_id_idx
  on public.content_assets (google_calendar_event_id);
