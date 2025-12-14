-- Add service role INSERT policies for edge function to write data
-- These allow the edge function (using service role) to insert data

CREATE POLICY "Service role can insert price_data" ON public.price_data
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can insert technical_indicators" ON public.technical_indicators
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can insert signals" ON public.signals
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can update signals" ON public.signals
    FOR UPDATE
    TO service_role
    USING (true);

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;