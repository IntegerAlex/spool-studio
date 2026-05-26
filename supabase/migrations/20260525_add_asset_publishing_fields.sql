-- Add asset-level publishing metadata for the agency workflow.
-- This migration is additive and safe for existing content assets.
alter table if exists public.content_assets
  add column if not exists publish_date date,
  add column if not exists publish_time time,
  add column if not exists scheduled_by uuid references public.users (id) on delete set null,
  add column if not exists published_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.users (id) on delete set null;

create index if not exists content_assets_publish_date_idx on public.content_assets (publish_date);
create index if not exists content_assets_published_at_idx on public.content_assets (published_at);
create index if not exists content_assets_approved_at_idx on public.content_assets (approved_at);
