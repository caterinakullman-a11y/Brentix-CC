-- ============================================
-- PART 2: ADDITIONAL TABLES
-- ============================================

-- 5. EQUITY CURVE
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

-- 6. MARKET EVENTS
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

-- 7. USER SETTINGS
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

-- 8. PATTERNS
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

-- 9. ML PREDICTIONS
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

-- 10. DAILY REPORTS
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
