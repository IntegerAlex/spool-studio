-- Returns per-client counts of content assets created during the week
-- starting at `week_start` (inclusive) through `week_start + 7 days` (exclusive).
-- Referenced by getWeeklyCountsGroupedByClient() in src/repositories/assets-repository.ts
-- and verified by checkClientGoalsMigration() in src/lib/migration-check.ts.
CREATE OR REPLACE FUNCTION "public"."clients_weekly_counts"(week_start timestamptz)
RETURNS TABLE ("client_id" uuid, "weekly_count" bigint) AS $$
  SELECT ca.client_id, COUNT(*)::bigint AS weekly_count
  FROM content_assets ca
  WHERE ca.created_at >= week_start
    AND ca.created_at < week_start + interval '7 days'
  GROUP BY ca.client_id
$$ LANGUAGE sql STABLE;
