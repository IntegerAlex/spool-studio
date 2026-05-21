-- Add drive_folder_url to content_assets for Google Drive linking
alter table if exists public.content_assets
  add column if not exists drive_folder_url text;

create index if not exists content_assets_drive_folder_url_idx on public.content_assets (drive_folder_url);
