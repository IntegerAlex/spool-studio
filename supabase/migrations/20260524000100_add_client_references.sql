begin;

do $$
begin
  create type public.client_reference_type as enum (
    'instagram',
    'website',
    'youtube',
    'pinterest',
    'drive_folder',
    'competitor',
    'branding',
    'reel_reference',
    'ad_reference',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

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

create index if not exists client_references_client_id_idx on public.client_references (client_id);
create index if not exists client_references_type_idx on public.client_references (type);

drop trigger if exists client_references_set_updated_at on public.client_references;
create trigger client_references_set_updated_at
before update on public.client_references
for each row execute function public.set_updated_at();

alter table public.client_references enable row level security;

drop policy if exists "Client references readable by authenticated" on public.client_references;
create policy "Client references readable by authenticated" on public.client_references
for select
to authenticated
using (true);

drop policy if exists "Client references managed by admins" on public.client_references;
create policy "Client references managed by admins" on public.client_references
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

commit;