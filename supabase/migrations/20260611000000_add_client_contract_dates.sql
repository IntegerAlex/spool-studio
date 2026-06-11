-- Add contract start and end dates to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS contract_end_date date;
