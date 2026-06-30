begin;

-- Add password_hash column for custom auth (replaces Supabase Auth)
alter table public.users add column if not exists password_hash text;

-- Password reset tokens
create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists password_resets_user_id_idx on public.password_resets (user_id);
create index if not exists password_resets_token_hash_idx on public.password_resets (token_hash);

-- Disable RLS on password_resets (server-only access)
alter table public.password_resets disable row level security;

commit;
