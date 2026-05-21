begin;

create type public.comment_type as enum (
  'comment',
  'revision',
  'approval_note',
  'internal_note'
);

create type public.revision_status as enum (
  'open',
  'resolved'
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

create index if not exists asset_comments_asset_id_idx on public.asset_comments (asset_id);
create index if not exists asset_comments_user_id_idx on public.asset_comments (user_id);
create index if not exists asset_comments_type_idx on public.asset_comments (type);
create index if not exists asset_comments_created_at_idx on public.asset_comments (created_at);

create trigger asset_comments_set_updated_at
before update on public.asset_comments
for each row execute function public.set_updated_at();

create table if not exists public.asset_activity_logs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.content_assets (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists asset_activity_logs_asset_id_idx on public.asset_activity_logs (asset_id);
create index if not exists asset_activity_logs_user_id_idx on public.asset_activity_logs (user_id);
create index if not exists asset_activity_logs_action_idx on public.asset_activity_logs (action);
create index if not exists asset_activity_logs_created_at_idx on public.asset_activity_logs (created_at);

alter table public.asset_comments enable row level security;
alter table public.asset_activity_logs enable row level security;

create policy "Asset comments readable by authenticated" on public.asset_comments
for select
to authenticated
using (true);

create policy "Asset comments insert by owner" on public.asset_comments
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Asset comments update by owner or admin" on public.asset_comments
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "Asset comments delete by owner or admin" on public.asset_comments
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "Asset activity readable by authenticated" on public.asset_activity_logs
for select
to authenticated
using (true);

create policy "Asset activity insert by actor" on public.asset_activity_logs
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

commit;
