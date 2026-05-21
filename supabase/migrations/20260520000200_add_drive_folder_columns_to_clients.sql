alter table if exists public.clients
  add column if not exists drive_folder_id text,
  add column if not exists drive_folder_url text;

create index if not exists clients_drive_folder_id_idx on public.clients (drive_folder_id);
