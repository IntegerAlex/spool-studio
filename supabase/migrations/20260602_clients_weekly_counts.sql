-- Create a function to return weekly asset counts grouped by client
CREATE OR REPLACE FUNCTION public.clients_weekly_counts(week_start timestamptz)
RETURNS TABLE(client_id uuid, weekly_count bigint) AS $$
  SELECT client_id, COUNT(*) AS weekly_count
  FROM public.content_assets
  WHERE created_at >= week_start
    AND status IN ('uploaded', 'ready_for_review', 'revision_requested', 'approved', 'published', 'scheduled')
  GROUP BY client_id;
$$ LANGUAGE sql STABLE;

-- Rollback: DROP FUNCTION public.clients_weekly_counts(timestamptz);
