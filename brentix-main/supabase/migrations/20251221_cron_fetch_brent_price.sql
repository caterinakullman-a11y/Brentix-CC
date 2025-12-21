-- Enable pg_net extension for HTTP calls (pg_cron should already be enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing job if it exists (ignore errors)
DO $$
BEGIN
  PERFORM cron.unschedule('fetch-brent-price-every-minute');
EXCEPTION WHEN OTHERS THEN
  -- Job doesn't exist, continue
  NULL;
END $$;

-- Schedule the job to run every minute
SELECT cron.schedule(
  'fetch-brent-price-every-minute',  -- job name
  '* * * * *',                        -- every minute
  $$
  SELECT net.http_post(
    url := 'https://vaoddzhefpthybuglxfp.supabase.co/functions/v1/fetch-brent-price',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2RkemhlZnB0aHlidWdseGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NjQzOTUsImV4cCI6MjA4MTA0MDM5NX0.cQTt4yIjMX3QyDBVsZzNPIsv3uoK7BHjEHC41_cr__4'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
