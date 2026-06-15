-- Composite index for queries filtering by status and ordering by created_at
-- Used by: buildClientMetricsMap(), listAssetsByStatuses(), Calendar/Queue pages
-- Created: 2026-06-14

BEGIN;

-- content_assets: composite index for status filter + created_at sort
-- Covers: WHERE status IN (...) ORDER BY created_at, and WHERE status = ... ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_content_assets_status_created_at 
  ON public.content_assets (status, created_at DESC);

-- content_assets: composite index for status filter + updated_at sort  
-- Covers: WHERE status IN (...) ORDER BY updated_at (listAssetsByStatuses)
CREATE INDEX IF NOT EXISTS idx_content_assets_status_updated_at 
  ON public.content_assets (status, updated_at DESC);

COMMIT;