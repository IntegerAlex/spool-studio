-- Add weekly poster and reel goal columns to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS weekly_poster_goal integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS weekly_reel_goal integer DEFAULT 0 NOT NULL;
