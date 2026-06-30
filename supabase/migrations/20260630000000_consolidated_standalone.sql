-- Consolidated migration for Neon PostgreSQL (standalone, no Supabase Auth)
-- Generated from 19 incremental migrations

begin;

create extension if not exists "pgcrypto";

-- Enums
create type public.user_role as enum ('admin', 'designer', 'approver', 'uploader');
create type public.asset_type as enum ('reel', 'poster');
create type public.asset_status as enum (
  'draft', 'uploading', 'uploaded', 'processing', 'approved',
  'published', 'failed', 'archived', 'in_design', 'ready_for_review',
  'revision_requested', 'scheduled'
);
create type public.comment_type as enum ('comment', 'revision', 'approval_note', 'internal_note');
create type public.revision_status as enum ('open', 'resolved');
create type public.client_reference_type as enum (
  'instagram', 'website', 'youtube', 'pinterest', 'drive_folder',
  'competitor', 'branding', 'reel_reference', 'ad_reference', 'other'
);

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  role public.user_role not null default 'designer',
  avatar_url text,
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  instagram_handle text,
  brand_color text,
  monthly_reels_target integer not null default 0,
  monthly_posts_target integer not null default 0,
  monthly_goal integer default 0 not null,
  weekly_goal integer default 0 not null,
  weekly_poster_goal integer default 0 not null,
  weekly_reel_goal integer default 0 not null,
  drive_folder_id text,
  drive_folder_url text,
  contract_start_date date,
  contract_end_date date,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_slug_lowercase check (slug = lower(slug))
);

create table if not exists public.content_assets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null,
  type public.asset_type not null,
  status public.asset_status not null default 'draft',
  drive_file_url text,
  drive_file_id text,
  drive_folder_id text,
  drive_folder_url text,
  thumbnail_url text,
  assigned_to uuid references public.users (id) on delete set null,
  created_by uuid not null references public.users (id) on delete restrict,
  scheduled_at timestamptz,
  mime_type text,
  file_size integer,
  file_extension text,
  uploaded_at timestamptz,
  uploaded_by uuid references public.users (id) on delete set null,
  media_width integer,
  media_height integer,
  duration_seconds double precision,
  current_revision_id uuid,
  latest_revision_id uuid,
  revision_count integer default 0 not null,
  publish_date date,
  publish_time time,
  scheduled_by uuid references public.users (id) on delete set null,
  published_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.asset_comments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.content_assets (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  type public.comment_type not null default 'comment',
  message text not null,
  revision_status public.revision_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_comments_revision_status_required
    check (type <> 'revision' or revision_status is not null)
);

create table if not exists public.asset_activity_logs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.content_assets (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.client_references (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null,
  url text not null,
  description text,
  type public.client_reference_type not null default 'other',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_references_url_not_empty check (length(trim(url)) > 0),
  constraint client_references_title_not_empty check (length(trim(title)) > 0)
);

create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists clients_created_by_idx on public.clients (created_by);
create index if not exists clients_drive_folder_id_idx on public.clients (drive_folder_id);
create index if not exists idx_clients_monthly_goal on public.clients(monthly_goal);
create index if not exists idx_clients_weekly_goal on public.clients(weekly_goal);
create index if not exists content_assets_client_id_idx on public.content_assets (client_id);
create index if not exists content_assets_status_idx on public.content_assets (status);
create index if not exists content_assets_assigned_to_idx on public.content_assets (assigned_to);
create index if not exists content_assets_created_by_idx on public.content_assets (created_by);
create index if not exists content_assets_scheduled_at_idx on public.content_assets (scheduled_at);
create index if not exists content_assets_drive_folder_url_idx on public.content_assets (drive_folder_url);
create index if not exists content_assets_drive_folder_id_idx on public.content_assets (drive_folder_id);
create index if not exists content_assets_uploaded_at_idx on public.content_assets (uploaded_at);
create index if not exists content_assets_uploaded_by_idx on public.content_assets (uploaded_by);
create index if not exists content_assets_current_revision_idx on public.content_assets (current_revision_id);
create index if not exists content_assets_latest_revision_idx on public.content_assets (latest_revision_id);
create index if not exists content_assets_publish_date_idx on public.content_assets (publish_date);
create index if not exists content_assets_published_at_idx on public.content_assets (published_at);
create index if not exists content_assets_approved_at_idx on public.content_assets (approved_at);
create index if not exists idx_content_assets_client_id ON public.content_assets (client_id);
create index if not exists idx_content_assets_status ON public.content_assets (status);
create index if not exists idx_content_assets_updated_at ON public.content_assets (updated_at DESC);
create index if not exists idx_content_assets_publish_date ON public.content_assets (publish_date);
create index if not exists idx_content_assets_assigned_to ON public.content_assets (assigned_to);
create index if not exists idx_content_assets_status_created_at ON public.content_assets (status, created_at DESC);
create index if not exists idx_content_assets_status_updated_at ON public.content_assets (status, updated_at DESC);
create index if not exists asset_revisions_asset_version_ux on public.asset_revisions (asset_id, version_number);
create index if not exists asset_revisions_asset_idx on public.asset_revisions (asset_id);
create index if not exists idx_asset_revisions_asset_id ON public.asset_revisions (asset_id);
create index if not exists asset_comments_asset_id_idx on public.asset_comments (asset_id);
create index if not exists asset_comments_user_id_idx on public.asset_comments (user_id);
create index if not exists asset_comments_type_idx on public.asset_comments (type);
create index if not exists asset_comments_created_at_idx on public.asset_comments (created_at);
create index if not exists idx_asset_comments_asset_id ON public.asset_comments (asset_id);
create index if not exists asset_activity_logs_asset_id_idx on public.asset_activity_logs (asset_id);
create index if not exists asset_activity_logs_user_id_idx on public.asset_activity_logs (user_id);
create index if not exists asset_activity_logs_action_idx on public.asset_activity_logs (action);
create index if not exists asset_activity_logs_created_at_idx on public.asset_activity_logs (created_at);
create index if not exists client_references_client_id_idx on public.client_references (client_id);
create index if not exists client_references_type_idx on public.client_references (type);
create index if not exists password_resets_user_id_idx on public.password_resets (user_id);
create index if not exists password_resets_token_hash_idx on public.password_resets (token_hash);

-- ============================================================
-- Triggers
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger content_assets_set_updated_at before update on public.content_assets for each row execute function public.set_updated_at();
create trigger asset_comments_set_updated_at before update on public.asset_comments for each row execute function public.set_updated_at();
create trigger client_references_set_updated_at before update on public.client_references for each row execute function public.set_updated_at();

-- ============================================================
-- Functions
-- ============================================================

create or replace function public.clients_weekly_counts(week_start timestamptz)
returns table(client_id uuid, weekly_count bigint) as $$
  SELECT client_id, COUNT(*) AS weekly_count
  FROM public.content_assets
  WHERE created_at >= week_start
    AND status IN ('uploaded', 'ready_for_review', 'revision_requested', 'approved', 'published', 'scheduled')
  GROUP BY client_id;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- RLS disabled (custom auth handles access control)
-- ============================================================

alter table public.users disable row level security;
alter table public.clients disable row level security;
alter table public.content_assets disable row level security;
alter table public.asset_comments disable row level security;
alter table public.asset_activity_logs disable row level security;
alter table public.client_references disable row level security;
alter table public.password_resets disable row level security;

commit;
