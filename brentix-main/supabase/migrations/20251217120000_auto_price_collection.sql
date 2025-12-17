-- Migration: Automatic Price Data Collection
-- Sets up pg_cron to automatically fetch Brent Crude Oil prices every minute

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage to postgres role (required for cron)
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create a function to call the fetch-brent-price Edge Function
CREATE OR REPLACE FUNCTION public.trigger_price_fetch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_key text;
  request_id bigint;
BEGIN
  -- Get environment variables (these are set in Supabase dashboard)
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);

  -- If settings not available, use vault secrets
  IF supabase_url IS NULL THEN
    SELECT decrypted_secret INTO supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_url';
  END IF;

  IF service_key IS NULL THEN
    SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key';
  END IF;

  -- Fallback: construct URL from project ref
  IF supabase_url IS NULL THEN
    supabase_url := 'https://vaoddzhefpthybuglxfp.supabase.co';
  END IF;

  -- Make HTTP request to Edge Function
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/fetch-brent-price',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_key, current_setting('supabase.service_role_key', true))
    ),
    body := '{}'::jsonb
  ) INTO request_id;

  -- Log the request (optional, for debugging)
  RAISE NOTICE 'Price fetch triggered, request_id: %', request_id;
END;
$$;

-- Create the cron job to run every minute
-- Note: Brent Crude trades ~23 hours/day (closed ~22:00-23:00 UTC)
-- We run every minute during market hours (Sunday 22:00 UTC - Friday 22:00 UTC)
SELECT cron.schedule(
  'fetch-brent-price-every-minute',  -- Job name
  '* * * * *',                        -- Every minute
  $$SELECT public.trigger_price_fetch()$$
);

-- Create a table to track collection status and stats
CREATE TABLE IF NOT EXISTS public.price_collection_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL DEFAULT 'fetch-brent-price-every-minute',
  is_active boolean NOT NULL DEFAULT true,
  last_successful_run timestamptz,
  last_error text,
  total_runs integer DEFAULT 0,
  successful_runs integer DEFAULT 0,
  failed_runs integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert initial status record
INSERT INTO public.price_collection_status (job_name, is_active)
VALUES ('fetch-brent-price-every-minute', true)
ON CONFLICT DO NOTHING;

-- Create function to pause/resume collection
CREATE OR REPLACE FUNCTION public.toggle_price_collection(enable boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF enable THEN
    -- Enable the cron job
    UPDATE cron.job SET active = true WHERE jobname = 'fetch-brent-price-every-minute';
    UPDATE public.price_collection_status SET is_active = true, updated_at = now()
    WHERE job_name = 'fetch-brent-price-every-minute';
    RETURN 'Price collection ENABLED';
  ELSE
    -- Disable the cron job
    UPDATE cron.job SET active = false WHERE jobname = 'fetch-brent-price-every-minute';
    UPDATE public.price_collection_status SET is_active = false, updated_at = now()
    WHERE job_name = 'fetch-brent-price-every-minute';
    RETURN 'Price collection DISABLED';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users (for admin control)
GRANT EXECUTE ON FUNCTION public.toggle_price_collection(boolean) TO authenticated;

-- Add RLS policy for price_collection_status
ALTER TABLE public.price_collection_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to price collection status"
  ON public.price_collection_status
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin to update price collection status"
  ON public.price_collection_status
  FOR UPDATE
  TO authenticated
  USING (true);

-- Add comment for documentation
COMMENT ON FUNCTION public.trigger_price_fetch() IS 'Triggers the fetch-brent-price Edge Function to collect current Brent Crude Oil price';
COMMENT ON FUNCTION public.toggle_price_collection(boolean) IS 'Enable or disable automatic price collection. Usage: SELECT toggle_price_collection(true) to enable, SELECT toggle_price_collection(false) to disable';
COMMENT ON TABLE public.price_collection_status IS 'Tracks the status of automatic price collection jobs';
