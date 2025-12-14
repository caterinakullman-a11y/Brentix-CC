-- ============================================
-- BRENTIX - SUPABASE DATABASE SCHEMA
-- Version 1.0
-- ============================================

-- ============================================
-- 1. PRICE_DATA (Price Data)
-- ============================================
CREATE TABLE public.price_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL UNIQUE,
    open DECIMAL(10, 4) NOT NULL,
    high DECIMAL(10, 4) NOT NULL,
    low DECIMAL(10, 4) NOT NULL,
    close DECIMAL(10, 4) NOT NULL,
    volume DECIMAL(15, 2),
    source VARCHAR(50) DEFAULT 'api',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_data_timestamp ON public.price_data(timestamp DESC);

-- ============================================
-- 2. TECHNICAL INDICATORS
-- ============================================
CREATE TABLE public.technical_indicators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    price_data_id UUID NOT NULL REFERENCES public.price_data(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL UNIQUE,
    sma_5 DECIMAL(10, 4),
    sma_10 DECIMAL(10, 4),
    sma_20 DECIMAL(10, 4),
    sma_50 DECIMAL(10, 4),
    ema_12 DECIMAL(10, 4),
    ema_26 DECIMAL(10, 4),
    rsi_14 DECIMAL(5, 2),
    macd DECIMAL(10, 4),
    macd_signal DECIMAL(10, 4),
    macd_histogram DECIMAL(10, 4),
    bollinger_upper DECIMAL(10, 4),
    bollinger_middle DECIMAL(10, 4),
    bollinger_lower DECIMAL(10, 4),
    atr_14 DECIMAL(10, 4),
    momentum_10 DECIMAL(10, 4),
    roc_10 DECIMAL(10, 4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tech_indicators_timestamp ON public.technical_indicators(timestamp DESC);

-- ============================================
-- 3. SIGNALS (Trading Signals)
-- ============================================
CREATE TYPE public.signal_type AS ENUM ('BUY', 'SELL', 'HOLD');
CREATE TYPE public.signal_strength AS ENUM ('STRONG', 'MODERATE', 'WEAK');

CREATE TABLE public.signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    signal_type public.signal_type NOT NULL,
    strength public.signal_strength NOT NULL,
    probability_up DECIMAL(5, 2) NOT NULL,
    probability_down DECIMAL(5, 2) NOT NULL,
    confidence DECIMAL(5, 2) NOT NULL,
    current_price DECIMAL(10, 4) NOT NULL,
    target_price DECIMAL(10, 4),
    stop_loss DECIMAL(10, 4),
    reasoning TEXT,
    indicators_used JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    executed BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signals_timestamp ON public.signals(timestamp DESC);
CREATE INDEX idx_signals_active ON public.signals(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_signals_type ON public.signals(signal_type);

-- ============================================
-- 4. TRADES
-- ============================================
CREATE TYPE public.trade_status AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

CREATE TABLE public.trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    signal_id UUID REFERENCES public.signals(id),
    entry_timestamp TIMESTAMPTZ NOT NULL,
    entry_price DECIMAL(10, 4) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    position_value_sek DECIMAL(12, 2) NOT NULL,
    exit_timestamp TIMESTAMPTZ,
    exit_price DECIMAL(10, 4),
    profit_loss_sek DECIMAL(12, 2),
    profit_loss_percent DECIMAL(8, 4),
    status public.trade_status DEFAULT 'OPEN',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trades_status ON public.trades(status);
CREATE INDEX idx_trades_entry_timestamp ON public.trades(entry_timestamp DESC);

-- ============================================
-- 5. EQUITY CURVE
-- ============================================
CREATE TABLE public.equity_curve (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    starting_capital_sek DECIMAL(12, 2) NOT NULL,
    ending_capital_sek DECIMAL(12, 2) NOT NULL,
    daily_profit_loss_sek DECIMAL(12, 2) NOT NULL,
    daily_profit_loss_percent DECIMAL(8, 4) NOT NULL,
    cumulative_profit_loss_sek DECIMAL(12, 2) NOT NULL,
    cumulative_profit_loss_percent DECIMAL(8, 4) NOT NULL,
    trades_count INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    win_rate DECIMAL(5, 2),
    max_drawdown_sek DECIMAL(12, 2),
    max_drawdown_percent DECIMAL(8, 4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_equity_curve_date ON public.equity_curve(date DESC);

-- ============================================
-- 6. MARKET EVENTS
-- ============================================
CREATE TYPE public.event_type AS ENUM (
    'EIA_REPORT', 'OPEC_DECISION', 'API_REPORT', 'NEWS', 
    'SANCTION', 'GEOPOLITICAL', 'PRODUCTION', 'OTHER'
);
CREATE TYPE public.event_impact AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN');

CREATE TABLE public.market_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    event_type public.event_type NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    source VARCHAR(200),
    source_url TEXT,
    expected_impact public.event_impact DEFAULT 'UNKNOWN',
    actual_price_impact DECIMAL(10, 4),
    sentiment_score DECIMAL(5, 2),
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_timestamp ON public.market_events(timestamp DESC);
CREATE INDEX idx_events_type ON public.market_events(event_type);

-- ============================================
-- 7. USER SETTINGS
-- ============================================
CREATE TABLE public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    initial_capital_sek DECIMAL(12, 2) DEFAULT 10000,
    current_capital_sek DECIMAL(12, 2) DEFAULT 10000,
    max_position_size_percent DECIMAL(5, 2) DEFAULT 10,
    stop_loss_percent DECIMAL(5, 2) DEFAULT 2,
    take_profit_percent DECIMAL(5, 2) DEFAULT 1,
    enable_push_notifications BOOLEAN DEFAULT TRUE,
    enable_email_notifications BOOLEAN DEFAULT FALSE,
    enable_sms_notifications BOOLEAN DEFAULT FALSE,
    phone_number VARCHAR(20),
    auto_trading_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. PATTERNS
-- ============================================
CREATE TYPE public.pattern_type AS ENUM (
    'DOUBLE_TOP', 'DOUBLE_BOTTOM', 'HEAD_SHOULDERS', 'INVERSE_HEAD_SHOULDERS',
    'TRIANGLE_ASCENDING', 'TRIANGLE_DESCENDING', 'CHANNEL_UP', 'CHANNEL_DOWN',
    'BREAKOUT', 'BREAKDOWN', 'RECURRING_MINUTE', 'OTHER'
);

CREATE TABLE public.patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    start_timestamp TIMESTAMPTZ NOT NULL,
    end_timestamp TIMESTAMPTZ NOT NULL,
    pattern_type public.pattern_type NOT NULL,
    confidence DECIMAL(5, 2) NOT NULL,
    expected_direction VARCHAR(10),
    expected_magnitude DECIMAL(8, 4),
    verified BOOLEAN DEFAULT FALSE,
    actual_direction VARCHAR(10),
    actual_magnitude DECIMAL(8, 4),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patterns_timestamp ON public.patterns(start_timestamp DESC);

-- ============================================
-- 9. ML PREDICTIONS
-- ============================================
CREATE TABLE public.ml_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    predicted_direction VARCHAR(10) NOT NULL,
    predicted_change_percent DECIMAL(8, 4),
    probability DECIMAL(5, 2) NOT NULL,
    features JSONB,
    actual_direction VARCHAR(10),
    actual_change_percent DECIMAL(8, 4),
    prediction_correct BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ml_predictions_timestamp ON public.ml_predictions(timestamp DESC);
CREATE INDEX idx_ml_predictions_model ON public.ml_predictions(model_version);

-- ============================================
-- 10. DAILY REPORTS
-- ============================================
CREATE TABLE public.daily_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    open_price DECIMAL(10, 4),
    close_price DECIMAL(10, 4),
    high_price DECIMAL(10, 4),
    low_price DECIMAL(10, 4),
    daily_change_percent DECIMAL(8, 4),
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    win_rate DECIMAL(5, 2),
    gross_profit_sek DECIMAL(12, 2) DEFAULT 0,
    gross_loss_sek DECIMAL(12, 2) DEFAULT 0,
    net_profit_sek DECIMAL(12, 2) DEFAULT 0,
    total_signals INTEGER DEFAULT 0,
    buy_signals INTEGER DEFAULT 0,
    sell_signals INTEGER DEFAULT 0,
    best_trade_profit_sek DECIMAL(12, 2),
    worst_trade_loss_sek DECIMAL(12, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.price_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for price_data" ON public.price_data FOR SELECT USING (true);

ALTER TABLE public.technical_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for technical_indicators" ON public.technical_indicators FOR SELECT USING (true);

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for signals" ON public.signals FOR SELECT USING (true);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for trades" ON public.trades FOR SELECT USING (true);

ALTER TABLE public.equity_curve ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for equity_curve" ON public.equity_curve FOR SELECT USING (true);

ALTER TABLE public.market_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for market_events" ON public.market_events FOR SELECT USING (true);

ALTER TABLE public.patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for patterns" ON public.patterns FOR SELECT USING (true);

ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for ml_predictions" ON public.ml_predictions FOR SELECT USING (true);

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for daily_reports" ON public.daily_reports FOR SELECT USING (true);

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_events;

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trades_updated_at
    BEFORE UPDATE ON public.trades
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();