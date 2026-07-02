-- Drop overly strict FK constraints on audit fields in content_assets
-- These are audit/tracking fields that should not block writes if a user is deleted
ALTER TABLE content_assets DROP CONSTRAINT IF EXISTS content_assets_approved_by_fkey;
ALTER TABLE content_assets DROP CONSTRAINT IF EXISTS content_assets_assigned_to_fkey;
ALTER TABLE content_assets DROP CONSTRAINT IF EXISTS content_assets_uploaded_by_fkey;
ALTER TABLE content_assets DROP CONSTRAINT IF EXISTS content_assets_scheduled_by_fkey;
