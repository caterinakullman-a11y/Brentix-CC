-- Add data_quality column to price_data if not exists
ALTER TABLE price_data ADD COLUMN IF NOT EXISTS data_quality VARCHAR(10) DEFAULT 'good';

-- Add index for source column on price_data
CREATE INDEX IF NOT EXISTS idx_price_data_source ON price_data(source);

-- Add comment for documentation
COMMENT ON TABLE price_data IS 'Stores all Brent Crude price data per second. Sources: live, yahoo_backfill, fred';

-- Create storage_settings table for storage limits and status
CREATE TABLE IF NOT EXISTS storage_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Lagringsgränser
  max_storage_bytes BIGINT DEFAULT 104857600, -- 100 MB
  warning_threshold_percent INTEGER DEFAULT 80, -- Varna vid 80%
  
  -- Aktuell användning (uppdateras av trigger/cron)
  current_storage_bytes BIGINT DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Backfill-status
  backfill_completed BOOLEAN DEFAULT false,
  backfill_started_at TIMESTAMPTZ,
  backfill_completed_at TIMESTAMPTZ,
  backfill_records_imported INTEGER DEFAULT 0,
  
  -- Export-historik
  last_export_at TIMESTAMPTZ,
  total_exports INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert initial storage_settings row
INSERT INTO storage_settings (id) 
SELECT gen_random_uuid() 
WHERE NOT EXISTS (SELECT 1 FROM storage_settings LIMIT 1);

-- Create data_exports table for export history
CREATE TABLE IF NOT EXISTS data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Export-detaljer
  export_type VARCHAR(20) NOT NULL, -- 'csv', 'json'
  date_from TIMESTAMPTZ NOT NULL,
  date_to TIMESTAMPTZ NOT NULL,
  resolution VARCHAR(20) NOT NULL, -- 'second', 'minute', 'hour', 'day'
  
  -- Resultat
  file_size_bytes BIGINT,
  record_count INTEGER,
  download_url TEXT,
  expires_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS on data_exports
ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;

-- RLS policies for data_exports
CREATE POLICY "Users can view own exports"
  ON data_exports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exports"
  ON data_exports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS policy for storage_settings - public read, service role write
ALTER TABLE storage_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for storage_settings"
  ON storage_settings FOR SELECT
  USING (true);

CREATE POLICY "Service role can update storage_settings"
  ON storage_settings FOR UPDATE
  USING (true);

CREATE POLICY "Service role can insert storage_settings"
  ON storage_settings FOR INSERT
  WITH CHECK (true);

-- Function to calculate storage usage
CREATE OR REPLACE FUNCTION calculate_storage_usage()
RETURNS BIGINT AS $$
DECLARE
  total_bytes BIGINT;
BEGIN
  -- Beräkna ungefärlig storlek av price_data
  SELECT pg_total_relation_size('price_data') INTO total_bytes;
  
  -- Uppdatera storage_settings
  UPDATE storage_settings
  SET 
    current_storage_bytes = total_bytes,
    last_calculated_at = now(),
    updated_at = now();
  
  RETURN total_bytes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to increment total_exports
CREATE OR REPLACE FUNCTION increment_exports()
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE storage_settings
  SET total_exports = total_exports + 1, updated_at = now()
  RETURNING total_exports INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;