-- ============================================
-- PRICE_DATA_LEGACY TABLE
-- Historical daily data for Brent Crude (1987-2019)
-- ============================================

-- Create the price_data_legacy table for historical daily data
CREATE TABLE IF NOT EXISTS public.price_data_legacy (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    open DECIMAL(10, 4),
    high DECIMAL(10, 4),
    low DECIMAL(10, 4),
    close DECIMAL(10, 4) NOT NULL,
    volume DECIMAL(15, 2),
    source VARCHAR(50) DEFAULT 'historical',
    data_quality VARCHAR(20) DEFAULT 'verified',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT price_data_legacy_date_unique UNIQUE (date)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_price_data_legacy_date
    ON public.price_data_legacy(date DESC);

CREATE INDEX IF NOT EXISTS idx_price_data_legacy_close
    ON public.price_data_legacy(close);

CREATE INDEX IF NOT EXISTS idx_price_data_legacy_year
    ON public.price_data_legacy(EXTRACT(YEAR FROM date));

-- Add comment for documentation
COMMENT ON TABLE public.price_data_legacy IS
    'Historical daily Brent Crude price data (1987-2019). Used for long-term analysis and backtesting.';

COMMENT ON COLUMN public.price_data_legacy.date IS 'Trading date (daily granularity)';
COMMENT ON COLUMN public.price_data_legacy.open IS 'Opening price (may be null for some historical data)';
COMMENT ON COLUMN public.price_data_legacy.high IS 'High price of the day (may be null)';
COMMENT ON COLUMN public.price_data_legacy.low IS 'Low price of the day (may be null)';
COMMENT ON COLUMN public.price_data_legacy.close IS 'Closing price (required)';
COMMENT ON COLUMN public.price_data_legacy.volume IS 'Trading volume (may be null for historical data)';
COMMENT ON COLUMN public.price_data_legacy.source IS 'Data source (e.g., eia, yahoo, csv_import)';
COMMENT ON COLUMN public.price_data_legacy.data_quality IS 'Data quality indicator (verified, estimated, interpolated)';

-- Enable RLS
ALTER TABLE public.price_data_legacy ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users to read
CREATE POLICY "Allow authenticated read access on price_data_legacy"
    ON public.price_data_legacy
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS Policy: Allow service role full access (for imports)
CREATE POLICY "Allow service role full access on price_data_legacy"
    ON public.price_data_legacy
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create a view that combines legacy and current data for unified queries
CREATE OR REPLACE VIEW public.price_data_all AS
SELECT
    id,
    date::timestamptz AS timestamp,
    open,
    high,
    low,
    close,
    volume,
    source,
    'daily' AS timeframe,
    created_at
FROM public.price_data_legacy
UNION ALL
SELECT
    id,
    timestamp,
    open,
    high,
    low,
    close,
    volume,
    source,
    'minute' AS timeframe,
    created_at
FROM public.price_data;

COMMENT ON VIEW public.price_data_all IS
    'Unified view combining legacy daily data (1987-2019) with current minute data (2020+)';

-- Grant permissions
GRANT SELECT ON public.price_data_legacy TO authenticated;
GRANT SELECT ON public.price_data_all TO authenticated;
GRANT ALL ON public.price_data_legacy TO service_role;
