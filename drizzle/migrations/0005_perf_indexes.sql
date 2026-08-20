-- perf indexes for hot paths: assets by status/client/updated_at, queue join
CREATE INDEX IF NOT EXISTS idx_content_assets_status ON content_assets(status);
CREATE INDEX IF NOT EXISTS idx_content_assets_updated_at ON content_assets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_assets_client_id ON content_assets(client_id);
CREATE INDEX IF NOT EXISTS idx_content_assets_created_by ON content_assets(created_by);
CREATE INDEX IF NOT EXISTS idx_upload_queue_asset_id ON upload_queue(asset_id);
CREATE INDEX IF NOT EXISTS idx_upload_queue_scheduled_date ON upload_queue(scheduled_date);
