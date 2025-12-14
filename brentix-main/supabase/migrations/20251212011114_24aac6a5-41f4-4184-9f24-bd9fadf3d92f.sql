
-- Create instruments table
CREATE TABLE public.instruments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  avanza_id VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  isin VARCHAR(20),
  
  -- Classification
  type VARCHAR(20) NOT NULL CHECK (type IN ('BULL', 'BEAR', 'ETF', 'STOCK')),
  underlying_asset VARCHAR(50),
  leverage DECIMAL(4,1),
  issuer VARCHAR(50),
  
  -- Trading info
  currency VARCHAR(3) DEFAULT 'SEK',
  exchange VARCHAR(50),
  
  -- Statistics (updated periodically)
  current_price DECIMAL(12,4),
  daily_change_percent DECIMAL(6,2),
  avg_volume_30d BIGINT,
  spread_percent DECIMAL(4,2),
  
  -- Correlation with underlying
  correlation_30d DECIMAL(5,4),
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create instrument_pairs table
CREATE TABLE public.instrument_pairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bull_instrument_id UUID REFERENCES public.instruments(id) ON DELETE CASCADE,
  bear_instrument_id UUID REFERENCES public.instruments(id) ON DELETE CASCADE,
  
  -- Match score
  correlation_score DECIMAL(5,2),
  leverage_match BOOLEAN DEFAULT false,
  issuer_match BOOLEAN DEFAULT false,
  volume_ratio DECIMAL(6,2),
  hedge_efficiency DECIMAL(5,2),
  
  recommended BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(bull_instrument_id, bear_instrument_id)
);

-- Create user_instrument_pairs table for user preferences
CREATE TABLE public.user_instrument_pairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  primary_instrument_id UUID REFERENCES public.instruments(id) ON DELETE CASCADE,
  counterweight_instrument_id UUID REFERENCES public.instruments(id) ON DELETE CASCADE,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instrument_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_instrument_pairs ENABLE ROW LEVEL SECURITY;

-- Instruments are readable by everyone
CREATE POLICY "Public read access for instruments"
ON public.instruments FOR SELECT
USING (true);

-- Instrument pairs are readable by everyone
CREATE POLICY "Public read access for instrument_pairs"
ON public.instrument_pairs FOR SELECT
USING (true);

-- Users can manage their own instrument pairs
CREATE POLICY "Users can view own instrument pairs"
ON public.user_instrument_pairs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own instrument pairs"
ON public.user_instrument_pairs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own instrument pairs"
ON public.user_instrument_pairs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own instrument pairs"
ON public.user_instrument_pairs FOR DELETE
USING (auth.uid() = user_id);

-- Insert default BULL/BEAR instruments for Brent Oil
INSERT INTO public.instruments (avanza_id, name, type, underlying_asset, leverage, issuer, exchange) VALUES
('2313155', 'BULL OLJA X15 AVA 5', 'BULL', 'BRENT', 15, 'AVA', 'NGM'),
('2313156', 'BEAR OLJA X15 AVA 5', 'BEAR', 'BRENT', 15, 'AVA', 'NGM'),
('1234567', 'BULL OLJA X10 NG', 'BULL', 'BRENT', 10, 'NORDNET', 'NGM'),
('1234568', 'BEAR OLJA X10 NG', 'BEAR', 'BRENT', 10, 'NORDNET', 'NGM'),
('2345678', 'BULL OLJA X5 SG', 'BULL', 'BRENT', 5, 'SG', 'NGM'),
('2345679', 'BEAR OLJA X5 SG', 'BEAR', 'BRENT', 5, 'SG', 'NGM');

-- Create default instrument pairs
INSERT INTO public.instrument_pairs (bull_instrument_id, bear_instrument_id, leverage_match, issuer_match, correlation_score, hedge_efficiency, recommended)
SELECT 
  b.id as bull_instrument_id,
  r.id as bear_instrument_id,
  b.leverage = r.leverage as leverage_match,
  b.issuer = r.issuer as issuer_match,
  CASE WHEN b.leverage = r.leverage AND b.issuer = r.issuer THEN 95 ELSE 70 END as correlation_score,
  CASE WHEN b.leverage = r.leverage THEN 90 ELSE 75 END as hedge_efficiency,
  b.leverage = r.leverage AND b.issuer = r.issuer as recommended
FROM public.instruments b
JOIN public.instruments r ON b.underlying_asset = r.underlying_asset
WHERE b.type = 'BULL' AND r.type = 'BEAR';

-- Indexes
CREATE INDEX idx_instruments_type ON public.instruments(type, underlying_asset);
CREATE INDEX idx_instrument_pairs_recommended ON public.instrument_pairs(recommended, correlation_score DESC);
CREATE INDEX idx_user_instrument_pairs_user ON public.user_instrument_pairs(user_id, is_active);
