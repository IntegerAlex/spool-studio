-- Drop ALL FK constraints referencing users.id on audit/tracking columns.
-- These fields are audit trails, not relational data. They must never
-- block writes when a user is deleted or the JWT user doesn't exist yet.
-- The user row is always ensured via getOrCreateCurrentUserProfile() at
-- the service layer, but the FK constraint itself is harmful.

-- content_assets
ALTER TABLE content_assets DROP CONSTRAINT IF EXISTS content_assets_approved_by_fkey;
ALTER TABLE content_assets DROP CONSTRAINT IF EXISTS content_assets_assigned_to_fkey;
ALTER TABLE content_assets DROP CONSTRAINT IF EXISTS content_assets_uploaded_by_fkey;
ALTER TABLE content_assets DROP CONSTRAINT IF EXISTS content_assets_scheduled_by_fkey;
ALTER TABLE content_assets DROP CONSTRAINT IF EXISTS content_assets_created_by_fkey;

-- asset_revisions
ALTER TABLE asset_revisions DROP CONSTRAINT IF EXISTS asset_revisions_uploaded_by_fkey;

-- asset_comments
ALTER TABLE asset_comments DROP CONSTRAINT IF EXISTS asset_comments_user_id_fkey;

-- asset_activity_logs
ALTER TABLE asset_activity_logs DROP CONSTRAINT IF EXISTS asset_activity_logs_user_id_fkey;

-- clients
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_created_by_fkey;

-- audit_logs
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
