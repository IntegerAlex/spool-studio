-- Create a revisions table to track immutable uploaded revisions per asset
create table if not exists public.asset_revisions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.content_assets(id) on delete cascade,
  version_number integer not null,
  uploaded_by uuid references public.users(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  drive_file_id text not null,
  drive_file_url text,
  file_size integer,
  mime_type text,
  media_width integer,
  media_height integer,
  duration_seconds double precision,
  change_note text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists asset_revisions_asset_version_ux on public.asset_revisions (asset_id, version_number);
create index if not exists asset_revisions_asset_idx on public.asset_revisions (asset_id);

-- Add pointers and counters to the assets table; additive and nullable for safe migration
alter table if exists public.content_assets
  add column if not exists current_revision_id uuid references public.asset_revisions(id) on delete set null,
  add column if not exists latest_revision_id uuid references public.asset_revisions(id) on delete set null,
  add column if not exists revision_count integer default 0 not null;

create index if not exists content_assets_current_revision_idx on public.content_assets (current_revision_id);
create index if not exists content_assets_latest_revision_idx on public.content_assets (latest_revision_id);

-- Guidance: After this migration, application logic should insert rows into asset_revisions
-- and update content_assets.latest_revision_id/current_revision_id and increment revision_count.
