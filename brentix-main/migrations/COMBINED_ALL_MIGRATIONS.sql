-- ====================================
-- COMBINED MIGRATIONS FOR BRENTIX
-- Generated: Mon Dec 15 02:38:34 UTC 2025
-- Run this file in Supabase Dashboard SQL Editor
-- ====================================


-- ====================================
-- 01_core_tables.sql
-- ====================================

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


-- ====================================
-- 02_additional_tables.sql
-- ====================================

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


-- ====================================
-- 03_rls_policies.sql
-- ====================================

-- ============================================
-- PART 3: ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equity_curve ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- User settings policies
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public read policies for market data
CREATE POLICY "Public read access for price_data" ON public.price_data FOR SELECT USING (true);
CREATE POLICY "Public read access for technical_indicators" ON public.technical_indicators FOR SELECT USING (true);
CREATE POLICY "Public read access for signals" ON public.signals FOR SELECT USING (true);
CREATE POLICY "Public read access for equity_curve" ON public.equity_curve FOR SELECT USING (true);
CREATE POLICY "Public read access for market_events" ON public.market_events FOR SELECT USING (true);
CREATE POLICY "Public read access for patterns" ON public.patterns FOR SELECT USING (true);
CREATE POLICY "Public read access for ml_predictions" ON public.ml_predictions FOR SELECT USING (true);
CREATE POLICY "Public read access for daily_reports" ON public.daily_reports FOR SELECT USING (true);

-- Service role INSERT policies
CREATE POLICY "Service role can insert price_data" ON public.price_data
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can insert technical_indicators" ON public.technical_indicators
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can insert signals" ON public.signals
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can update signals" ON public.signals
    FOR UPDATE TO service_role USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_events;


-- ====================================
-- 04_functions_triggers.sql
-- ====================================

-- ============================================
-- PART 4: FUNCTIONS AND TRIGGERS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_trades_updated_at
    BEFORE UPDATE ON public.trades
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add Avanza integration fields to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS avanza_account_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS avanza_instrument_id VARCHAR(50) DEFAULT '2313155',
ADD COLUMN IF NOT EXISTS position_size_sek DECIMAL(12,2) DEFAULT 1000;

-- Add auto execution fields to signals
ALTER TABLE signals
ADD COLUMN IF NOT EXISTS auto_executed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS execution_result JSONB;


-- ====================================
-- 05_trade_queue.sql
-- ====================================

-- ============================================
-- PART 5: TRADE EXECUTION QUEUE
-- ============================================

-- Trade execution queue table
CREATE TABLE IF NOT EXISTS trade_execution_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  UNIQUE(signal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON trade_execution_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_created ON trade_execution_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_user ON trade_execution_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_signals_auto_executed ON signals(auto_executed);

-- Trigger function for auto-queue
CREATE OR REPLACE FUNCTION notify_new_signal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.signal_type IN ('BUY', 'SELL') AND NEW.is_active = TRUE THEN
    INSERT INTO trade_execution_queue (signal_id, user_id, created_at, status)
    SELECT NEW.id, us.user_id, NOW(), 'PENDING'
    FROM user_settings us
    WHERE us.auto_trading_enabled = TRUE
      AND us.avanza_account_id IS NOT NULL
      AND us.avanza_account_id != ''
    ON CONFLICT (signal_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_signal ON signals;
CREATE TRIGGER on_new_signal
  AFTER INSERT ON signals
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_signal();

-- RLS for trade_execution_queue
ALTER TABLE trade_execution_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON trade_execution_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own queue items" ON trade_execution_queue
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON trade_execution_queue TO service_role;
GRANT SELECT ON trade_execution_queue TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE trade_execution_queue;

-- Helper view
CREATE OR REPLACE VIEW pending_trades
WITH (security_invoker = true)
AS
SELECT
  q.id as queue_id, q.signal_id, q.user_id, q.status, q.created_at,
  s.signal_type, s.current_price, s.confidence,
  us.avanza_account_id, us.avanza_instrument_id, us.position_size_sek
FROM trade_execution_queue q
JOIN signals s ON q.signal_id = s.id
JOIN user_settings us ON q.user_id = us.user_id
WHERE q.status = 'PENDING';

GRANT SELECT ON pending_trades TO service_role;

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_queue_items(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM trade_execution_queue
  WHERE processed_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND status IN ('COMPLETED', 'FAILED');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


-- ====================================
-- 06_profiles_roles.sql
-- ====================================

-- ============================================
-- PART 6: PROFILES AND USER ROLES
-- ============================================

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'approved')
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- User roles RLS policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'pending');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin promotion function
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM public.profiles WHERE email = user_email;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  UPDATE public.profiles SET status = 'approved', approved_at = NOW() WHERE id = target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;


-- ====================================
-- 07_paper_trading.sql
-- ====================================

-- ============================================
-- PART 7: PAPER TRADING & NOTIFICATIONS
-- ============================================

-- Add paper trading fields to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS show_loading_skeletons boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS paper_trading_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS paper_balance numeric(12,2) DEFAULT 100000,
ADD COLUMN IF NOT EXISTS paper_starting_balance numeric(12,2) DEFAULT 100000,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Paper trades table
CREATE TABLE public.paper_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id uuid REFERENCES public.signals(id),
  entry_timestamp timestamptz NOT NULL,
  exit_timestamp timestamptz,
  entry_price numeric NOT NULL,
  exit_price numeric,
  quantity numeric NOT NULL,
  position_value_sek numeric NOT NULL,
  profit_loss_sek numeric,
  profit_loss_percent numeric,
  status text DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own paper trades" ON public.paper_trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own paper trades" ON public.paper_trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own paper trades" ON public.paper_trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own paper trades" ON public.paper_trades FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_paper_trades_updated_at
  BEFORE UPDATE ON public.paper_trades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Error logs table
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  error_type VARCHAR(50) NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID,
  endpoint VARCHAR(255),
  severity VARCHAR(20) NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can insert error_logs" ON public.error_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can insert own error_logs" ON public.error_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admins can view error_logs" ON public.error_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_error_logs_timestamp ON public.error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('signal', 'trade', 'system', 'alert')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Add notification preferences
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS notify_new_signals BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_trade_executed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_daily_summary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_sound_enabled BOOLEAN DEFAULT true;

-- Signal notification function
CREATE OR REPLACE FUNCTION public.create_signal_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.signal_type IN ('BUY', 'SELL') AND NEW.is_active = TRUE THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT us.user_id, 'signal',
      CASE WHEN NEW.signal_type = 'BUY' THEN 'BUY Signal' ELSE 'SELL Signal' END,
      NEW.signal_type || ' signal - Confidence: ' || ROUND(NEW.confidence * 100) || '%',
      jsonb_build_object('signal_id', NEW.id, 'signal_type', NEW.signal_type, 'confidence', NEW.confidence)
    FROM user_settings us WHERE us.notify_new_signals = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_signal_notification ON public.signals;
CREATE TRIGGER on_new_signal_notification
  AFTER INSERT ON public.signals
  FOR EACH ROW EXECUTE FUNCTION public.create_signal_notification();


-- ====================================
-- 08_patterns_history.sql
-- ====================================

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


-- ====================================
-- 09_trading_rules.sql
-- ====================================

-- ============================================
-- PART 9: TRADING RULES & INSTRUMENTS
-- ============================================

-- Trading rules table
CREATE TABLE public.trading_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  rule_type VARCHAR(20) NOT NULL DEFAULT 'BUY',
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  logic_operator VARCHAR(10) NOT NULL DEFAULT 'AND',
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  stop_loss_percent DECIMAL(5,2),
  take_profit_percent DECIMAL(5,2),
  trailing_stop BOOLEAN DEFAULT false,
  backtest_results JSONB,
  is_active BOOLEAN DEFAULT false,
  is_system_suggested BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0
);

ALTER TABLE public.trading_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all rules" ON public.trading_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own rules" ON public.trading_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rules" ON public.trading_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rules" ON public.trading_rules FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_trading_rules_user_active ON public.trading_rules(user_id, is_active);
CREATE INDEX idx_trading_rules_priority ON public.trading_rules(is_active, priority DESC);

CREATE TRIGGER update_trading_rules_updated_at
  BEFORE UPDATE ON public.trading_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backtest runs table
CREATE TABLE public.backtest_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  rule_id UUID REFERENCES public.trading_rules(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  gross_profit DECIMAL(12,2) DEFAULT 0,
  gross_loss DECIMAL(12,2) DEFAULT 0,
  net_profit DECIMAL(12,2) DEFAULT 0,
  win_rate DECIMAL(5,2),
  profit_factor DECIMAL(6,2),
  avg_win DECIMAL(10,2),
  avg_loss DECIMAL(10,2),
  max_drawdown_percent DECIMAL(6,2),
  max_consecutive_losses INTEGER DEFAULT 0,
  trades JSONB DEFAULT '[]'::jsonb,
  equity_curve JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.backtest_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own backtest runs" ON public.backtest_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own backtest runs" ON public.backtest_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own backtest runs" ON public.backtest_runs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_backtest_runs_rule ON public.backtest_runs(rule_id, created_at DESC);
CREATE INDEX idx_backtest_runs_user ON public.backtest_runs(user_id, created_at DESC);

-- Instruments table
CREATE TABLE public.instruments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  avanza_id VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  isin VARCHAR(20),
  type VARCHAR(20) NOT NULL CHECK (type IN ('BULL', 'BEAR', 'ETF', 'STOCK')),
  underlying_asset VARCHAR(50),
  leverage DECIMAL(4,1),
  issuer VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'SEK',
  exchange VARCHAR(50),
  current_price DECIMAL(12,4),
  daily_change_percent DECIMAL(6,2),
  avg_volume_30d BIGINT,
  spread_percent DECIMAL(4,2),
  correlation_30d DECIMAL(5,4),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.instrument_pairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bull_instrument_id UUID REFERENCES public.instruments(id) ON DELETE CASCADE,
  bear_instrument_id UUID REFERENCES public.instruments(id) ON DELETE CASCADE,
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

CREATE TABLE public.user_instrument_pairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  primary_instrument_id UUID REFERENCES public.instruments(id) ON DELETE CASCADE,
  counterweight_instrument_id UUID REFERENCES public.instruments(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instrument_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_instrument_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for instruments" ON public.instruments FOR SELECT USING (true);
CREATE POLICY "Public read access for instrument_pairs" ON public.instrument_pairs FOR SELECT USING (true);
CREATE POLICY "Users can view own instrument pairs" ON public.user_instrument_pairs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own instrument pairs" ON public.user_instrument_pairs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own instrument pairs" ON public.user_instrument_pairs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own instrument pairs" ON public.user_instrument_pairs FOR DELETE USING (auth.uid() = user_id);

-- Insert default instruments
INSERT INTO public.instruments (avanza_id, name, type, underlying_asset, leverage, issuer, exchange) VALUES
('2313155', 'BULL OLJA X15 AVA 5', 'BULL', 'BRENT', 15, 'AVA', 'NGM'),
('2313156', 'BEAR OLJA X15 AVA 5', 'BEAR', 'BRENT', 15, 'AVA', 'NGM'),
('1234567', 'BULL OLJA X10 NG', 'BULL', 'BRENT', 10, 'NORDNET', 'NGM'),
('1234568', 'BEAR OLJA X10 NG', 'BEAR', 'BRENT', 10, 'NORDNET', 'NGM'),
('2345678', 'BULL OLJA X5 SG', 'BULL', 'BRENT', 5, 'SG', 'NGM'),
('2345679', 'BEAR OLJA X5 SG', 'BEAR', 'BRENT', 5, 'SG', 'NGM');

-- Create instrument pairs
INSERT INTO public.instrument_pairs (bull_instrument_id, bear_instrument_id, leverage_match, issuer_match, correlation_score, hedge_efficiency, recommended)
SELECT b.id, r.id, b.leverage = r.leverage, b.issuer = r.issuer,
  CASE WHEN b.leverage = r.leverage AND b.issuer = r.issuer THEN 95 ELSE 70 END,
  CASE WHEN b.leverage = r.leverage THEN 90 ELSE 75 END,
  b.leverage = r.leverage AND b.issuer = r.issuer
FROM public.instruments b
JOIN public.instruments r ON b.underlying_asset = r.underlying_asset
WHERE b.type = 'BULL' AND r.type = 'BEAR';

CREATE INDEX idx_instruments_type ON public.instruments(type, underlying_asset);
CREATE INDEX idx_instrument_pairs_recommended ON public.instrument_pairs(recommended, correlation_score DESC);
CREATE INDEX idx_user_instrument_pairs_user ON public.user_instrument_pairs(user_id, is_active);

ALTER PUBLICATION supabase_realtime ADD TABLE public.instruments;


-- ====================================
-- 10_safety_advanced.sql
-- ====================================

-- ============================================
-- PART 10: SAFETY, ORDERS & ADVANCED FEATURES
-- ============================================

-- Emergency stops table
CREATE TABLE public.emergency_stops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT false,
  triggered_at TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  close_all_positions BOOLEAN DEFAULT true,
  disable_auto_trading BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Auto-triggers table
CREATE TABLE public.auto_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  trigger_type VARCHAR NOT NULL,
  threshold_value NUMERIC NOT NULL,
  threshold_type VARCHAR NOT NULL DEFAULT 'PERCENT',
  action VARCHAR NOT NULL,
  is_active BOOLEAN DEFAULT true,
  triggered_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Conditional orders table
CREATE TABLE public.conditional_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instrument_id UUID REFERENCES instruments(id),
  order_type VARCHAR NOT NULL,
  direction VARCHAR NOT NULL,
  trigger_price NUMERIC,
  limit_price NUMERIC,
  quantity NUMERIC NOT NULL,
  trailing_percent NUMERIC,
  status VARCHAR DEFAULT 'PENDING',
  expires_at TIMESTAMP WITH TIME ZONE,
  triggered_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  execution_result JSONB,
  peak_price numeric,
  trough_price numeric,
  initial_trigger_price numeric,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.emergency_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conditional_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own emergency stops" ON public.emergency_stops FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own emergency stops" ON public.emergency_stops FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own emergency stops" ON public.emergency_stops FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own emergency stops" ON public.emergency_stops FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own auto triggers" ON public.auto_triggers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own auto triggers" ON public.auto_triggers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own auto triggers" ON public.auto_triggers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own auto triggers" ON public.auto_triggers FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own conditional orders" ON public.conditional_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conditional orders" ON public.conditional_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conditional orders" ON public.conditional_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conditional orders" ON public.conditional_orders FOR DELETE USING (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER update_emergency_stops_updated_at BEFORE UPDATE ON public.emergency_stops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_auto_triggers_updated_at BEFORE UPDATE ON public.auto_triggers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conditional_orders_updated_at BEFORE UPDATE ON public.conditional_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.conditional_orders;

-- Add user_id to trades table and fix RLS
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
DROP POLICY IF EXISTS "Public read access for trades" ON public.trades;
CREATE POLICY "Users can view own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trades" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trades" ON public.trades FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access for trades" ON public.trades FOR ALL USING (true) WITH CHECK (true);

-- Add extra columns to various tables
ALTER TABLE price_data ADD COLUMN IF NOT EXISTS data_quality VARCHAR(10) DEFAULT 'good';
CREATE INDEX IF NOT EXISTS idx_price_data_source ON price_data(source);

ALTER TABLE public.paper_trades
ADD COLUMN IF NOT EXISTS instrument_type VARCHAR(10),
ADD COLUMN IF NOT EXISTS direction VARCHAR(10),
ADD COLUMN IF NOT EXISTS amount_sek DECIMAL,
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.trade_execution_queue ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS preferred_bull_id VARCHAR(50) DEFAULT '2313155',
ADD COLUMN IF NOT EXISTS preferred_bear_id VARCHAR(50) DEFAULT '2313156';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_price_data_timestamp_desc ON price_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_signals_active_ts ON signals(is_active, timestamp DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_conditional_orders_pending ON conditional_orders(status, user_id) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_technical_indicators_timestamp_desc ON technical_indicators(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_paper_trades_user_status ON paper_trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trade_queue_status_pending ON trade_execution_queue(status, created_at) WHERE status = 'PENDING';

-- Atomic signal creation function
CREATE OR REPLACE FUNCTION public.create_signal_atomic(
  p_signal_type TEXT, p_strength TEXT, p_confidence NUMERIC,
  p_probability_up NUMERIC, p_probability_down NUMERIC,
  p_current_price NUMERIC, p_target_price NUMERIC, p_stop_loss NUMERIC,
  p_reasoning TEXT, p_indicators_used JSONB
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_signal_id UUID;
BEGIN
  UPDATE signals SET is_active = false WHERE is_active = true;
  INSERT INTO signals (signal_type, strength, confidence, probability_up, probability_down,
    current_price, target_price, stop_loss, reasoning, indicators_used, timestamp, is_active)
  VALUES (p_signal_type::signal_type, p_strength::signal_strength, p_confidence,
    p_probability_up, p_probability_down, p_current_price, p_target_price,
    p_stop_loss, p_reasoning, p_indicators_used, NOW(), true)
  RETURNING id INTO v_signal_id;
  RETURN v_signal_id;
END;
$$;

-- Analysis tool settings table
CREATE TABLE IF NOT EXISTS analysis_tool_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  frequency_analyzer_enabled BOOLEAN DEFAULT true,
  momentum_pulse_enabled BOOLEAN DEFAULT true,
  volatility_window_enabled BOOLEAN DEFAULT true,
  micro_pattern_enabled BOOLEAN DEFAULT true,
  smart_exit_enabled BOOLEAN DEFAULT true,
  reversal_meter_enabled BOOLEAN DEFAULT true,
  timing_score_enabled BOOLEAN DEFAULT true,
  correlation_radar_enabled BOOLEAN DEFAULT true,
  risk_per_minute_enabled BOOLEAN DEFAULT true,
  frequency_lookback_days INTEGER DEFAULT 30,
  momentum_sensitivity DECIMAL DEFAULT 1.0,
  volatility_window_hours INTEGER DEFAULT 168,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE analysis_tool_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tool settings" ON analysis_tool_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tool settings" ON analysis_tool_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tool settings" ON analysis_tool_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_analysis_tool_settings_updated_at
  BEFORE UPDATE ON analysis_tool_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage settings table
CREATE TABLE IF NOT EXISTS storage_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  max_storage_bytes BIGINT DEFAULT 104857600,
  warning_threshold_percent INTEGER DEFAULT 80,
  current_storage_bytes BIGINT DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  backfill_completed BOOLEAN DEFAULT false,
  backfill_started_at TIMESTAMPTZ,
  backfill_completed_at TIMESTAMPTZ,
  backfill_records_imported INTEGER DEFAULT 0,
  last_export_at TIMESTAMPTZ,
  total_exports INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO storage_settings (id) SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM storage_settings LIMIT 1);

ALTER TABLE storage_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for storage_settings" ON storage_settings FOR SELECT USING (true);
CREATE POLICY "Service role can update storage_settings" ON storage_settings FOR UPDATE USING (true);
CREATE POLICY "Service role can insert storage_settings" ON storage_settings FOR INSERT WITH CHECK (true);

