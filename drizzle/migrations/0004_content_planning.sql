-- Content planning foundation: service cycles, content plans, asset numbering,
-- immutable publication records, and the SQL functions that back them.
-- Authored to mirror the upstream Supabase migrations while fitting the
-- Drizzle-based schema used by this project.

-- ============================================================
-- 1. cycle_status enum
-- ============================================================
DO $$
BEGIN
  CREATE TYPE public.cycle_status AS ENUM ('upcoming', 'active', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. service_cycles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.service_cycles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  reels_target    integer NOT NULL DEFAULT 0,
  posters_target  integer NOT NULL DEFAULT 0,
  status          public.cycle_status NOT NULL DEFAULT 'upcoming',
  created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- Enforce ONE active cycle per client at the database level.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_cycle_per_client
  ON public.service_cycles (client_id)
  WHERE status = 'active';

-- ============================================================
-- 3. content_plans
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id        uuid NOT NULL REFERENCES public.service_cycles(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  week_number     integer NOT NULL,
  week_start      date NOT NULL,
  week_end        date NOT NULL,
  planned_reels   integer NOT NULL DEFAULT 0,
  planned_posters integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_week_per_cycle UNIQUE (cycle_id, week_number)
);

-- ============================================================
-- 4. service_cycle_sequences (monotonic numbering)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.service_cycle_sequences (
  cycle_id    uuid NOT NULL REFERENCES public.service_cycles(id) ON DELETE CASCADE,
  asset_type  public.asset_type NOT NULL,
  next_number integer NOT NULL DEFAULT 1,

  PRIMARY KEY (cycle_id, asset_type)
);

-- ============================================================
-- 5. asset_publication_records (immutable history)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.asset_publication_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        uuid NOT NULL,
  client_id       uuid,
  client_name     text,
  title           text,
  type            public.asset_type,
  uploaded_at     timestamptz,
  approved_at     timestamptz,
  published_at    timestamptz,
  publish_date    date,
  publish_time    time,
  created_at      timestamptz,
  drive_file_url  text,
  assigned_to     uuid,
  approved_by     uuid,
  revision_count  integer,

  CONSTRAINT unique_asset_publication UNIQUE (asset_id)
);

-- ============================================================
-- 6. Add cycle linkage to content_assets
-- ============================================================
ALTER TABLE public.content_assets
  ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.service_cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS asset_number integer;

CREATE INDEX IF NOT EXISTS idx_content_assets_cycle_id
  ON public.content_assets (cycle_id);
CREATE INDEX IF NOT EXISTS idx_content_assets_cycle_type
  ON public.content_assets (cycle_id, type);

-- ============================================================
-- 7. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_service_cycles_client_id
  ON public.service_cycles (client_id, status);
CREATE INDEX IF NOT EXISTS idx_service_cycles_dates
  ON public.service_cycles (client_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_content_plans_cycle_id
  ON public.content_plans (cycle_id);
CREATE INDEX IF NOT EXISTS idx_content_plans_client_id
  ON public.content_plans (client_id);

-- ============================================================
-- 8. set_updated_at trigger helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_cycles_set_updated_at ON public.service_cycles;
CREATE TRIGGER service_cycles_set_updated_at
  BEFORE UPDATE ON public.service_cycles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 9. assign_asset_number (monotonic, race-safe)
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_asset_number(
  p_cycle_id uuid,
  p_asset_type public.asset_type
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_next integer;
BEGIN
  UPDATE public.service_cycle_sequences
  SET next_number = next_number + 1
  WHERE cycle_id = p_cycle_id AND asset_type = p_asset_type
  RETURNING next_number - 1 INTO v_next;

  IF v_next IS NULL THEN
    INSERT INTO public.service_cycle_sequences (cycle_id, asset_type, next_number)
    VALUES (p_cycle_id, p_asset_type, 2)
    ON CONFLICT (cycle_id, asset_type) DO UPDATE
      SET next_number = public.service_cycle_sequences.next_number + 1
    RETURNING next_number - 1 INTO v_next;
  END IF;

  RETURN v_next;
END;
$$;

-- ============================================================
-- 10. publish_asset_with_record (atomic publication + history)
-- ============================================================
CREATE OR REPLACE FUNCTION public.publish_asset_with_record(
  p_asset_id uuid,
  p_updates jsonb,
  p_published_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_asset record;
  v_client_name text;
BEGIN
  UPDATE public.content_assets SET
    client_id          = CASE WHEN p_updates ? 'client_id'          THEN (p_updates->>'client_id')::uuid            ELSE client_id          END,
    title              = CASE WHEN p_updates ? 'title'              THEN p_updates->>'title'                        ELSE title              END,
    type               = CASE WHEN p_updates ? 'type'               THEN (p_updates->>'type')::public.asset_type    ELSE type               END,
    status             = CASE WHEN p_updates ? 'status'             THEN (p_updates->>'status')::public.asset_status ELSE status             END,
    drive_file_url     = CASE WHEN p_updates ? 'drive_file_url'     THEN p_updates->>'drive_file_url'               ELSE drive_file_url     END,
    drive_folder_id    = CASE WHEN p_updates ? 'drive_folder_id'    THEN p_updates->>'drive_folder_id'              ELSE drive_folder_id    END,
    drive_folder_url   = CASE WHEN p_updates ? 'drive_folder_url'   THEN p_updates->>'drive_folder_url'             ELSE drive_folder_url   END,
    thumbnail_url      = CASE WHEN p_updates ? 'thumbnail_url'      THEN p_updates->>'thumbnail_url'                ELSE thumbnail_url      END,
    assigned_to        = CASE WHEN p_updates ? 'assigned_to'        THEN (p_updates->>'assigned_to')::uuid          ELSE assigned_to        END,
    scheduled_at       = CASE WHEN p_updates ? 'scheduled_at'       THEN (p_updates->>'scheduled_at')::timestamptz  ELSE scheduled_at       END,
    publish_date       = CASE WHEN p_updates ? 'publish_date'       THEN (p_updates->>'publish_date')::date         ELSE publish_date       END,
    publish_time       = CASE WHEN p_updates ? 'publish_time'       THEN (p_updates->>'publish_time')::time         ELSE publish_time       END,
    scheduled_by       = CASE WHEN p_updates ? 'scheduled_by'       THEN (p_updates->>'scheduled_by')::uuid         ELSE scheduled_by       END,
    published_at       = CASE WHEN p_updates ? 'published_at'       THEN (p_updates->>'published_at')::timestamptz  ELSE published_at       END,
    approved_at        = CASE WHEN p_updates ? 'approved_at'        THEN (p_updates->>'approved_at')::timestamptz   ELSE approved_at        END,
    approved_by        = CASE WHEN p_updates ? 'approved_by'        THEN (p_updates->>'approved_by')::uuid          ELSE approved_by        END,
    updated_at         = now()
  WHERE id = p_asset_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset not found: %', p_asset_id;
  END IF;

  SELECT * INTO v_asset FROM public.content_assets WHERE id = p_asset_id;

  SELECT name INTO v_client_name FROM public.clients WHERE id = v_asset.client_id;
  IF NOT FOUND THEN
    v_client_name := 'Unknown Client';
  END IF;

  INSERT INTO public.asset_publication_records (
    asset_id, client_id, client_name, title, type, uploaded_at, approved_at,
    published_at, publish_date, publish_time, created_at, drive_file_url,
    assigned_to, approved_by, revision_count
  ) VALUES (
    v_asset.id, v_asset.client_id, v_client_name, v_asset.title, v_asset.type,
    v_asset.uploaded_at, COALESCE(v_asset.approved_at, p_published_at), p_published_at,
    v_asset.publish_date, v_asset.publish_time, v_asset.created_at, v_asset.drive_file_url,
    v_asset.assigned_to, v_asset.approved_by, v_asset.revision_count
  );
END;
$$;

-- ============================================================
-- 11. generate_content_plan (TypeScript plan-utils is preferred; this
--     SQL variant is kept for parity and uses delete-then-insert so
--     regeneration stays clean).
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_content_plan(
  p_cycle_id uuid
)
RETURNS setof public.content_plans
LANGUAGE plpgsql
AS $$
DECLARE
  v_rec record;
  v_num_weeks integer;
  v_base_reels integer;
  v_base_posters integer;
  v_reel_remainder integer;
  v_poster_remainder integer;
  v_i integer;
  v_week_start date;
  v_week_end date;
  v_reels integer;
  v_posters integer;
BEGIN
  SELECT * INTO v_rec FROM public.service_cycles WHERE id = p_cycle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cycle not found';
  END IF;

  DELETE FROM public.content_plans WHERE cycle_id = p_cycle_id;

  v_num_weeks := ceil((v_rec.end_date - v_rec.start_date + 1) / 7.0);
  v_base_reels := v_rec.reels_target / v_num_weeks;
  v_base_posters := v_rec.posters_target / v_num_weeks;
  v_reel_remainder := v_rec.reels_target - (v_base_reels * v_num_weeks);
  v_poster_remainder := v_rec.posters_target - (v_base_posters * v_num_weeks);

  FOR v_i IN 0 .. (v_num_weeks - 1) LOOP
    v_week_start := v_rec.start_date + (v_i * 7);
    v_week_end := least(v_week_start + 6, v_rec.end_date);

    v_reels := v_base_reels + CASE
      WHEN v_reel_remainder > 0 AND (v_i + 1) = ANY(
        ARRAY(SELECT generate_series(1, v_num_weeks, greatest(1, v_num_weeks / (v_reel_remainder + 1))))
      ) THEN 1 ELSE 0
    END;

    v_posters := v_base_posters + CASE
      WHEN v_poster_remainder > 0 AND (v_i + 1) = ANY(
        ARRAY(SELECT generate_series(1, v_num_weeks, greatest(1, v_num_weeks / (v_poster_remainder + 1))))
      ) THEN 1 ELSE 0
    END;

    RETURN QUERY INSERT INTO public.content_plans
      (cycle_id, client_id, week_number, week_start, week_end, planned_reels, planned_posters)
    VALUES
      (p_cycle_id, v_rec.client_id, v_i + 1, v_week_start, v_week_end, v_reels, v_posters)
    RETURNING *;
  END LOOP;
END;
$$;
