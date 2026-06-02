-- Add weekly and monthly goal columns to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS monthly_goal integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS weekly_goal integer DEFAULT 0 NOT NULL;

-- Add indexes to make goal queries fast (if needed)
CREATE INDEX IF NOT EXISTS idx_clients_monthly_goal ON public.clients(monthly_goal);
CREATE INDEX IF NOT EXISTS idx_clients_weekly_goal ON public.clients(weekly_goal);
