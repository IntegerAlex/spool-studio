-- Stores a recurrence rule (jsonb) for an event, or null for a one-off event.
ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS recurrence jsonb NULL;
COMMENT ON COLUMN content_assets.recurrence IS 'Recurrence rule for the event, or null for a one-off.';

ALTER TABLE upload_queue ADD COLUMN IF NOT EXISTS recurrence jsonb NULL;
COMMENT ON COLUMN upload_queue.recurrence IS 'Recurrence rule for the upload, or null for a one-off.';
