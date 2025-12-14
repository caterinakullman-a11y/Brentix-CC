-- ============================================
-- PART 1: CORE TABLES
-- ============================================

-- 1. PRICE_DATA
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

-- 2. TECHNICAL INDICATORS
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

-- 3. SIGNALS
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

-- 4. TRADES
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
