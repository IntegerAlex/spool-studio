begin;

create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'designer', 'approver', 'uploader');
create type public.asset_type as enum ('reel', 'poster');
create type public.asset_status as enum (
  'draft',
  'uploading',
  'uploaded',
  'processing',
  'approved',
  'published',
  'failed',
  'archived',
  'in_design',
  'ready_for_review',
  'revision_requested',
  'scheduled'
);

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'designer',
  avatar_url text,
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
  thumbnail_url text,
  assigned_to uuid references public.users (id) on delete set null,
  created_by uuid not null references public.users (id) on delete restrict,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_created_by_idx on public.clients (created_by);
create index if not exists content_assets_client_id_idx on public.content_assets (client_id);
create index if not exists content_assets_status_idx on public.content_assets (status);
create index if not exists content_assets_assigned_to_idx on public.content_assets (assigned_to);
create index if not exists content_assets_created_by_idx on public.content_assets (created_by);
create index if not exists content_assets_scheduled_at_idx on public.content_assets (scheduled_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger content_assets_set_updated_at
before update on public.content_assets
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    case
      when (new.raw_user_meta_data ->> 'role') in ('admin', 'designer', 'approver', 'uploader')
        then (new.raw_user_meta_data ->> 'role')::public.user_role
      else 'designer'
    end,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.content_assets enable row level security;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_user_role() = 'admin';
$$;

create policy "Users can read profiles" on public.users
for select
to authenticated
using (true);

create policy "Users can update own profile" on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Clients readable by authenticated" on public.clients
for select
to authenticated
using (true);

create policy "Clients managed by admins" on public.clients
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Assets readable by authenticated" on public.content_assets
for select
to authenticated
using (true);

create policy "Assets insert by creators" on public.content_assets
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.current_user_role() in ('admin', 'designer', 'uploader')
);

create policy "Assets update by owner or assignee" on public.content_assets
for update
to authenticated
using (
  public.is_admin()
  or created_by = auth.uid()
  or assigned_to = auth.uid()
)
with check (
  public.is_admin()
  or created_by = auth.uid()
  or assigned_to = auth.uid()
);

create policy "Assets delete by admins" on public.content_assets
for delete
to authenticated
using (public.is_admin());

commit;
