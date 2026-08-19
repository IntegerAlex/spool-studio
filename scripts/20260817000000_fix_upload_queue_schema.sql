-- Fix upload_queue schema drift: the route/page/type expect
-- scheduled_date, platform, caption, and hashtags, but the table
-- only had id, asset_id, status, priority, created_at, updated_at.
-- Also correct the queue route's JOIN to content_assets (not assets)
-- and scope by a.created_by (no client_users table exists).

ALTER TABLE upload_queue
  ADD COLUMN IF NOT EXISTS scheduled_date timestamptz,
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS caption text,
  ADD COLUMN IF NOT EXISTS hashtags text;
