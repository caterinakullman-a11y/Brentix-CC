-- Create historical_prices table for FRED data (1987-present)
CREATE TABLE public.historical_prices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    price NUMERIC NOT NULL,
    source VARCHAR DEFAULT 'FRED',
    series_id VARCHAR DEFAULT 'DCOILBRENTEU',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for date queries
CREATE INDEX idx_historical_prices_date ON public.historical_prices(date DESC);

-- Enable Row Level Security
ALTER TABLE public.historical_prices ENABLE ROW LEVEL SECURITY;

-- Public read access (historical data is public)
CREATE POLICY "Public read access for historical_prices" 
ON public.historical_prices 
FOR SELECT 
USING (true);

-- Service role can insert/update
CREATE POLICY "Service role can insert historical_prices" 
ON public.historical_prices 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update historical_prices" 
ON public.historical_prices 
FOR UPDATE 
USING (true);