-- Create pattern_type enum if not exists (extending existing)
-- Pattern occurrences table for detected patterns in historical data
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

-- Create indexes for efficient querying
CREATE INDEX idx_pattern_occurrences_dates ON public.pattern_occurrences(start_date DESC, end_date DESC);
CREATE INDEX idx_pattern_occurrences_type ON public.pattern_occurrences(pattern_type);
CREATE INDEX idx_pattern_occurrences_outcome ON public.pattern_occurrences(outcome);

-- Enable RLS
ALTER TABLE public.pattern_occurrences ENABLE ROW LEVEL SECURITY;

-- Public read access for pattern occurrences
CREATE POLICY "Public read access for pattern_occurrences" 
ON public.pattern_occurrences 
FOR SELECT 
USING (true);

-- Service role can insert/update patterns
CREATE POLICY "Service role can insert pattern_occurrences" 
ON public.pattern_occurrences 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update pattern_occurrences" 
ON public.pattern_occurrences 
FOR UPDATE 
USING (true);

-- Pattern definitions table (the 8 universal patterns)
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

-- Enable RLS
ALTER TABLE public.pattern_definitions ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for pattern_definitions" 
ON public.pattern_definitions 
FOR SELECT 
USING (true);

-- Insert the 8 universal trading patterns
INSERT INTO public.pattern_definitions (pattern_type, name, description, category, direction, parameters) VALUES
('MOMENTUM_BREAKOUT', 'Momentum Breakout', 'Price breaks above resistance with strong volume and momentum indicators confirming the move', 'MOMENTUM', 'BULLISH', '{"rsi_threshold": 60, "volume_multiplier": 1.5, "lookback_days": 20}'),
('RSI_OVERSOLD_BOUNCE', 'RSI Oversold Bounce', 'RSI drops below 30 and then crosses back above, signaling potential reversal from oversold conditions', 'REVERSAL', 'BULLISH', '{"rsi_oversold": 30, "rsi_signal": 35, "confirmation_days": 2}'),
('MACD_GOLDEN_CROSS', 'MACD Golden Cross', 'MACD line crosses above signal line while both are below zero, indicating bullish momentum shift', 'MOMENTUM', 'BULLISH', '{"signal_threshold": 0, "histogram_confirmation": true}'),
('VOLATILITY_SQUEEZE', 'Volatility Squeeze', 'Bollinger Bands contract significantly followed by expansion, indicating imminent breakout', 'VOLATILITY', 'BOTH', '{"bb_width_percentile": 10, "squeeze_days": 5, "expansion_threshold": 1.5}'),
('MEAN_REVERSION', 'Mean Reversion', 'Price deviates significantly from moving average and reverts back toward the mean', 'REVERSAL', 'BOTH', '{"deviation_std": 2, "ma_period": 20, "reversion_threshold": 0.5}'),
('VOLUME_SPIKE', 'Volume Spike', 'Unusually high volume accompanied by significant price movement signals institutional activity', 'MOMENTUM', 'BOTH', '{"volume_multiplier": 3, "price_change_min": 2, "confirmation_required": true}'),
('DOUBLE_BOTTOM', 'Double Bottom', 'Price forms two consecutive lows at similar levels with a peak in between, signaling bullish reversal', 'REVERSAL', 'BULLISH', '{"tolerance_percent": 3, "min_days_between": 10, "neckline_break": true}'),
('TREND_CONTINUATION', 'Trend Continuation', 'Price consolidates in existing trend before continuing in same direction with renewed momentum', 'TREND', 'BOTH', '{"trend_strength": 0.7, "consolidation_days": 5, "breakout_confirmation": true}');