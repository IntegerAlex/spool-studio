begin;

create table if not exists public.google_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  google_email text,
  access_token text not null,
  refresh_token text,
  expiry_date bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists google_integrations_user_id_ux on public.google_integrations (user_id);

create trigger google_integrations_set_updated_at
before update on public.google_integrations
for each row execute function public.set_updated_at();

alter table public.google_integrations enable row level security;

create policy "Google integrations readable by owner" on public.google_integrations
for select
to authenticated
using (user_id = auth.uid());

create policy "Google integrations insert by owner" on public.google_integrations
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Google integrations update by owner" on public.google_integrations
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Google integrations delete by owner" on public.google_integrations
for delete
to authenticated
using (user_id = auth.uid());

commit;
