-- ============================================
-- PART 8: HISTORICAL PRICES & PATTERN ANALYSIS
-- ============================================

-- Historical prices table (FRED data)
CREATE TABLE public.historical_prices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    price NUMERIC NOT NULL,
    source VARCHAR DEFAULT 'FRED',
    series_id VARCHAR DEFAULT 'DCOILBRENTEU',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_historical_prices_date ON public.historical_prices(date DESC);
ALTER TABLE public.historical_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for historical_prices" ON public.historical_prices FOR SELECT USING (true);
CREATE POLICY "Service role can insert historical_prices" ON public.historical_prices FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update historical_prices" ON public.historical_prices FOR UPDATE USING (true);

-- Pattern occurrences table
CREATE TABLE public.pattern_occurrences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pattern_type VARCHAR NOT NULL,
    pattern_name VARCHAR NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    direction VARCHAR NOT NULL CHECK (direction IN ('BULLISH', 'BEARISH', 'NEUTRAL')),
    entry_price NUMERIC,
    target_price NUMERIC,
    stop_loss NUMERIC,
    outcome VARCHAR CHECK (outcome IN ('SUCCESS', 'FAILURE', 'PENDING', NULL)),
    actual_return_percent NUMERIC,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_pattern_occurrences_dates ON public.pattern_occurrences(start_date DESC, end_date DESC);
CREATE INDEX idx_pattern_occurrences_type ON public.pattern_occurrences(pattern_type);
CREATE INDEX idx_pattern_occurrences_outcome ON public.pattern_occurrences(outcome);

ALTER TABLE public.pattern_occurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for pattern_occurrences" ON public.pattern_occurrences FOR SELECT USING (true);
CREATE POLICY "Service role can insert pattern_occurrences" ON public.pattern_occurrences FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update pattern_occurrences" ON public.pattern_occurrences FOR UPDATE USING (true);

-- Pattern definitions table
CREATE TABLE public.pattern_definitions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pattern_type VARCHAR NOT NULL UNIQUE,
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR NOT NULL CHECK (category IN ('MOMENTUM', 'REVERSAL', 'TREND', 'VOLATILITY')),
    direction VARCHAR NOT NULL CHECK (direction IN ('BULLISH', 'BEARISH', 'BOTH')),
    timeframe VARCHAR DEFAULT 'DAILY',
    parameters JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    success_rate NUMERIC,
    avg_return_percent NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.pattern_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for pattern_definitions" ON public.pattern_definitions FOR SELECT USING (true);

-- Insert default patterns
INSERT INTO public.pattern_definitions (pattern_type, name, description, category, direction, parameters) VALUES
('MOMENTUM_BREAKOUT', 'Momentum Breakout', 'Price breaks above resistance with strong momentum', 'MOMENTUM', 'BULLISH', '{"rsi_threshold": 60, "volume_multiplier": 1.5}'),
('RSI_OVERSOLD_BOUNCE', 'RSI Oversold Bounce', 'RSI drops below 30 then crosses back above', 'REVERSAL', 'BULLISH', '{"rsi_oversold": 30, "rsi_signal": 35}'),
('MACD_GOLDEN_CROSS', 'MACD Golden Cross', 'MACD line crosses above signal line', 'MOMENTUM', 'BULLISH', '{"signal_threshold": 0}'),
('VOLATILITY_SQUEEZE', 'Volatility Squeeze', 'Bollinger Bands contract then expand', 'VOLATILITY', 'BOTH', '{"bb_width_percentile": 10}'),
('MEAN_REVERSION', 'Mean Reversion', 'Price reverts to moving average', 'REVERSAL', 'BOTH', '{"deviation_std": 2, "ma_period": 20}'),
('VOLUME_SPIKE', 'Volume Spike', 'Unusually high volume with price movement', 'MOMENTUM', 'BOTH', '{"volume_multiplier": 3}'),
('DOUBLE_BOTTOM', 'Double Bottom', 'Two consecutive lows signal bullish reversal', 'REVERSAL', 'BULLISH', '{"tolerance_percent": 3}'),
('TREND_CONTINUATION', 'Trend Continuation', 'Price consolidates then continues trend', 'TREND', 'BOTH', '{"trend_strength": 0.7}');
