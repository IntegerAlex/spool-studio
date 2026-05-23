-- Add nullable asset metadata columns to the existing content_assets table.
-- This migration is additive and safe for databases that already contain assets.
alter table if exists public.content_assets
  add column if not exists mime_type text,
  add column if not exists file_size integer,
  add column if not exists file_extension text,
  add column if not exists uploaded_at timestamptz,
  add column if not exists uploaded_by uuid references public.users (id) on delete set null,
  add column if not exists drive_file_id text,
  add column if not exists media_width integer,
  add column if not exists media_height integer,
  add column if not exists duration_seconds double precision;

create index if not exists content_assets_uploaded_at_idx on public.content_assets (uploaded_at);
create index if not exists content_assets_uploaded_by_idx on public.content_assets (uploaded_by);

-- Verification guidance:
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'content_assets'
-- order by ordinal_position;