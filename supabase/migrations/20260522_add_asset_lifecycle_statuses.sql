-- Add lifecycle statuses to the existing asset_status enum.
-- Safe to run on databases that already contain any subset of these values.
ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'uploading' AFTER 'draft';
ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'uploaded' AFTER 'uploading';
ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'processing' AFTER 'uploaded';
ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'approved' AFTER 'processing';
ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'published' AFTER 'approved';
ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'failed' AFTER 'published';
ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'archived' AFTER 'failed';

-- Diagnostics for verification:
-- SELECT enumlabel
-- FROM pg_enum
-- JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
-- WHERE pg_type.typname = 'asset_status'
-- ORDER BY enumsortorder;
