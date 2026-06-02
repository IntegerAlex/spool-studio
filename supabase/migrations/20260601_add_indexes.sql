-- Add low-risk, high-impact indexes for common filters and sorts
-- Created: 2026-06-01

BEGIN;

-- content_assets: filter by client_id
CREATE INDEX IF NOT EXISTS idx_content_assets_client_id ON public.content_assets (client_id);

-- content_assets: filter by status
CREATE INDEX IF NOT EXISTS idx_content_assets_status ON public.content_assets (status);

-- content_assets: order/filter by updated_at (common ordering)
CREATE INDEX IF NOT EXISTS idx_content_assets_updated_at ON public.content_assets (updated_at DESC);

-- content_assets: queries filtering by publish_date
CREATE INDEX IF NOT EXISTS idx_content_assets_publish_date ON public.content_assets (publish_date);

-- content_assets: filter by assigned_to
CREATE INDEX IF NOT EXISTS idx_content_assets_assigned_to ON public.content_assets (assigned_to);

-- asset_revisions: lookup revisions for an asset
CREATE INDEX IF NOT EXISTS idx_asset_revisions_asset_id ON public.asset_revisions (asset_id);

-- asset_comments: lookup comments by asset
CREATE INDEX IF NOT EXISTS idx_asset_comments_asset_id ON public.asset_comments (asset_id);

COMMIT;
