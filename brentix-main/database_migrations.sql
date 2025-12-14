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
    EXECUTE FUNCTION public.update_updated_at_column();-- Fix search_path security warning
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;-- Add service role INSERT policies for edge function to write data
-- These allow the edge function (using service role) to insert data

CREATE POLICY "Service role can insert price_data" ON public.price_data
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can insert technical_indicators" ON public.technical_indicators
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can insert signals" ON public.signals
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can update signals" ON public.signals
    FOR UPDATE
    TO service_role
    USING (true);

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;-- Add Avanza integration fields to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS avanza_account_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS avanza_instrument_id VARCHAR(50) DEFAULT '2313155',
ADD COLUMN IF NOT EXISTS position_size_sek DECIMAL(12,2) DEFAULT 1000;

-- Add auto execution fields to signals
ALTER TABLE signals 
ADD COLUMN IF NOT EXISTS auto_executed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS execution_result JSONB;-- ============================================
-- BRENTIX - Trade Execution Queue Migration
-- ============================================

-- ============================================
-- 1. TRADE EXECUTION QUEUE: Create table
-- ============================================
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

COMMENT ON TABLE trade_execution_queue IS 'Queue for pending auto-trade executions';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_queue_status ON trade_execution_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_created ON trade_execution_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_user ON trade_execution_queue(user_id);

-- Index for faster signal queries
CREATE INDEX IF NOT EXISTS idx_signals_auto_executed ON signals(auto_executed);

-- ============================================
-- 2. TRIGGER FUNCTION: Auto-queue on new signal
-- ============================================
CREATE OR REPLACE FUNCTION notify_new_signal()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process BUY or SELL signals that are active
  IF NEW.signal_type IN ('BUY', 'SELL') AND NEW.is_active = TRUE THEN
    -- Add to queue for all users with auto trading enabled
    INSERT INTO trade_execution_queue (signal_id, user_id, created_at, status)
    SELECT 
      NEW.id,
      us.user_id,
      NOW(),
      'PENDING'
    FROM user_settings us
    WHERE us.auto_trading_enabled = TRUE
      AND us.avanza_account_id IS NOT NULL
      AND us.avanza_account_id != ''
    ON CONFLICT (signal_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'New % signal queued for auto-trading: %', NEW.signal_type, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- 3. CREATE TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS on_new_signal ON signals;

CREATE TRIGGER on_new_signal
  AFTER INSERT ON signals
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_signal();

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE trade_execution_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role full access" ON trade_execution_queue;
DROP POLICY IF EXISTS "Users can view own queue items" ON trade_execution_queue;

-- Service role can do everything
CREATE POLICY "Service role full access" ON trade_execution_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own queue items (read-only)
CREATE POLICY "Users can view own queue items" ON trade_execution_queue
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- 5. GRANTS
-- ============================================
GRANT ALL ON trade_execution_queue TO service_role;
GRANT SELECT ON trade_execution_queue TO authenticated;

-- ============================================
-- 6. REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE trade_execution_queue;

-- ============================================
-- 7. HELPER VIEW: Active queue items
-- ============================================
CREATE OR REPLACE VIEW pending_trades AS
SELECT 
  q.id as queue_id,
  q.signal_id,
  q.user_id,
  q.status,
  q.created_at,
  s.signal_type,
  s.current_price,
  s.confidence,
  us.avanza_account_id,
  us.avanza_instrument_id,
  us.position_size_sek
FROM trade_execution_queue q
JOIN signals s ON q.signal_id = s.id
JOIN user_settings us ON q.user_id = us.user_id
WHERE q.status = 'PENDING';

GRANT SELECT ON pending_trades TO service_role;

-- ============================================
-- 8. CLEANUP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_queue_items(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM trade_execution_queue
  WHERE processed_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND status IN ('COMPLETED', 'FAILED');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;-- Fix security definer view by changing to SECURITY INVOKER
DROP VIEW IF EXISTS pending_trades;

CREATE VIEW pending_trades 
WITH (security_invoker = true)
AS
SELECT 
  q.id as queue_id,
  q.signal_id,
  q.user_id,
  q.status,
  q.created_at,
  s.signal_type,
  s.current_price,
  s.confidence,
  us.avanza_account_id,
  us.avanza_instrument_id,
  us.position_size_sek
FROM trade_execution_queue q
JOIN signals s ON q.signal_id = s.id
JOIN user_settings us ON q.user_id = us.user_id
WHERE q.status = 'PENDING';

GRANT SELECT ON pending_trades TO service_role;-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table (WITHOUT role - security best practice)
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

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS on both tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND status = 'approved'
  )
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

-- Auto-create profile and default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'pending');
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();-- Add loading skeletons preference to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN show_loading_skeletons boolean DEFAULT true;-- Add paper trading fields to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN paper_trading_enabled boolean DEFAULT true,
ADD COLUMN paper_balance numeric(12,2) DEFAULT 100000,
ADD COLUMN paper_starting_balance numeric(12,2) DEFAULT 100000;

-- Create paper_trades table
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

-- Enable RLS
ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;

-- Users can only see their own paper trades
CREATE POLICY "Users can view own paper trades" ON public.paper_trades
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own paper trades
CREATE POLICY "Users can insert own paper trades" ON public.paper_trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own paper trades
CREATE POLICY "Users can update own paper trades" ON public.paper_trades
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own paper trades
CREATE POLICY "Users can delete own paper trades" ON public.paper_trades
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_paper_trades_updated_at
  BEFORE UPDATE ON public.paper_trades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();-- Create error_logs table for tracking application errors
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

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert errors (from edge functions)
CREATE POLICY "Service role can insert error_logs"
ON public.error_logs
FOR INSERT
WITH CHECK (true);

-- Allow authenticated users to insert their own errors
CREATE POLICY "Users can insert own error_logs"
ON public.error_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all error logs
CREATE POLICY "Admins can view error_logs"
ON public.error_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_error_logs_timestamp ON public.error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);-- Create notifications table
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

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Add notification preferences to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS notify_new_signals BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_trade_executed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_daily_summary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_sound_enabled BOOLEAN DEFAULT true;

-- Create function to auto-create notification on new signal
CREATE OR REPLACE FUNCTION public.create_signal_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only for BUY or SELL signals
  IF NEW.signal_type IN ('BUY', 'SELL') AND NEW.is_active = TRUE THEN
    -- Create notification for all users with notify_new_signals enabled
    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT 
      us.user_id,
      'signal',
      CASE WHEN NEW.signal_type = 'BUY' THEN '🟢 BUY Signal' ELSE '🔴 SELL Signal' END,
      NEW.signal_type || ' signal generated - Confidence: ' || ROUND(NEW.confidence * 100) || '%',
      jsonb_build_object('signal_id', NEW.id, 'signal_type', NEW.signal_type, 'confidence', NEW.confidence)
    FROM user_settings us
    WHERE us.notify_new_signals = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for signal notifications
DROP TRIGGER IF EXISTS on_new_signal_notification ON public.signals;
CREATE TRIGGER on_new_signal_notification
  AFTER INSERT ON public.signals
  FOR EACH ROW
  EXECUTE FUNCTION public.create_signal_notification();-- Add onboarding tracking to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;-- Create historical_prices table for FRED data (1987-present)
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
USING (true);-- Create pattern_type enum if not exists (extending existing)
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
('TREND_CONTINUATION', 'Trend Continuation', 'Price consolidates in existing trend before continuing in same direction with renewed momentum', 'TREND', 'BOTH', '{"trend_strength": 0.7, "consolidation_days": 5, "breakout_confirmation": true}');-- Create trading_rules table for user-defined trading rules
CREATE TABLE public.trading_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Rule type
  rule_type VARCHAR(20) NOT NULL DEFAULT 'BUY', -- 'BUY', 'SELL', 'BOTH'
  
  -- Rule conditions (JSON structure)
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Logic operator for combining conditions
  logic_operator VARCHAR(10) NOT NULL DEFAULT 'AND', -- 'AND', 'OR'
  
  -- Action configuration
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Risk management
  stop_loss_percent DECIMAL(5,2),
  take_profit_percent DECIMAL(5,2),
  trailing_stop BOOLEAN DEFAULT false,
  
  -- Backtest results (cached)
  backtest_results JSONB,
  
  -- Status
  is_active BOOLEAN DEFAULT false,
  is_system_suggested BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 50,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.trading_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own rules"
  ON public.trading_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rules"
  ON public.trading_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rules"
  ON public.trading_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rules"
  ON public.trading_rules FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_trading_rules_user_active ON public.trading_rules(user_id, is_active);
CREATE INDEX idx_trading_rules_priority ON public.trading_rules(is_active, priority DESC);

-- Trigger for updated_at
CREATE TRIGGER update_trading_rules_updated_at
  BEFORE UPDATE ON public.trading_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert 5 system-suggested rules based on the design document
INSERT INTO public.trading_rules (user_id, name, description, rule_type, conditions, logic_operator, action_config, is_system_suggested, backtest_results)
SELECT 
  id as user_id,
  'Snabb Momentum Uppåt',
  'Om kursen stiger >0.2% under kort tid → KÖP BULL',
  'BUY',
  '[{"type": "price_change", "direction": "up", "min_percent": 0.2, "duration_seconds": 60}]'::jsonb,
  'AND',
  '{"instrument": "BULL", "amount_type": "SEK", "amount": 1000}'::jsonb,
  true,
  '{"win_rate": 67, "avg_return": 1.2, "trades": 47}'::jsonb
FROM auth.users
LIMIT 0; -- Don't insert for any users yet, just define the structure
-- Create backtest_runs table for storing backtest results
CREATE TABLE public.backtest_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  rule_id UUID REFERENCES public.trading_rules(id) ON DELETE CASCADE,
  
  -- Test period
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Results
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
  
  -- Detailed results
  trades JSONB DEFAULT '[]'::jsonb,
  equity_curve JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backtest_runs ENABLE ROW LEVEL SECURITY;

-- Users can view their own backtest runs
CREATE POLICY "Users can view own backtest runs"
ON public.backtest_runs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own backtest runs
CREATE POLICY "Users can insert own backtest runs"
ON public.backtest_runs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own backtest runs
CREATE POLICY "Users can delete own backtest runs"
ON public.backtest_runs
FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_backtest_runs_rule ON public.backtest_runs(rule_id, created_at DESC);
CREATE INDEX idx_backtest_runs_user ON public.backtest_runs(user_id, created_at DESC);

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
-- Phase 6: Safety & Orders - Create tables for emergency stops, auto-triggers, and conditional orders

-- Table for emergency stop settings
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

-- Table for auto-triggers (max loss limits, daily limits, etc.)
CREATE TABLE public.auto_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  trigger_type VARCHAR NOT NULL, -- 'MAX_DAILY_LOSS', 'MAX_POSITION_LOSS', 'MAX_DRAWDOWN', 'PROFIT_TARGET'
  threshold_value NUMERIC NOT NULL,
  threshold_type VARCHAR NOT NULL DEFAULT 'PERCENT', -- 'PERCENT' or 'ABSOLUTE'
  action VARCHAR NOT NULL, -- 'CLOSE_POSITION', 'CLOSE_ALL', 'STOP_TRADING', 'NOTIFY'
  is_active BOOLEAN DEFAULT true,
  triggered_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for conditional orders
CREATE TABLE public.conditional_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instrument_id UUID REFERENCES instruments(id),
  order_type VARCHAR NOT NULL, -- 'LIMIT', 'STOP', 'STOP_LIMIT', 'TRAILING_STOP'
  direction VARCHAR NOT NULL, -- 'BUY', 'SELL'
  trigger_price NUMERIC,
  limit_price NUMERIC,
  quantity NUMERIC NOT NULL,
  trailing_percent NUMERIC,
  status VARCHAR DEFAULT 'PENDING', -- 'PENDING', 'TRIGGERED', 'EXECUTED', 'CANCELLED', 'EXPIRED'
  expires_at TIMESTAMP WITH TIME ZONE,
  triggered_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  execution_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.emergency_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conditional_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emergency_stops
CREATE POLICY "Users can view own emergency stops" ON public.emergency_stops FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own emergency stops" ON public.emergency_stops FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own emergency stops" ON public.emergency_stops FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own emergency stops" ON public.emergency_stops FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for auto_triggers
CREATE POLICY "Users can view own auto triggers" ON public.auto_triggers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own auto triggers" ON public.auto_triggers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own auto triggers" ON public.auto_triggers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own auto triggers" ON public.auto_triggers FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for conditional_orders
CREATE POLICY "Users can view own conditional orders" ON public.conditional_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conditional orders" ON public.conditional_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conditional orders" ON public.conditional_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conditional orders" ON public.conditional_orders FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_emergency_stops_updated_at BEFORE UPDATE ON public.emergency_stops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_auto_triggers_updated_at BEFORE UPDATE ON public.auto_triggers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conditional_orders_updated_at BEFORE UPDATE ON public.conditional_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for instruments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.instruments;-- Enable realtime for conditional_orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.conditional_orders;-- Add tracking fields to conditional_orders for trailing stop
ALTER TABLE public.conditional_orders 
ADD COLUMN IF NOT EXISTS peak_price numeric,
ADD COLUMN IF NOT EXISTS trough_price numeric,
ADD COLUMN IF NOT EXISTS initial_trigger_price numeric;-- This migration will be run AFTER the user registers via /register
-- It sets the user as approved and grants admin role

-- First, let's create a function that can be called to promote a user to admin by email
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get user ID from profiles
  SELECT id INTO target_user_id FROM public.profiles WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Update profile to approved
  UPDATE public.profiles 
  SET status = 'approved', approved_at = NOW()
  WHERE id = target_user_id;
  
  -- Add admin role (upsert to avoid duplicates)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;-- Kritiska index för prestanda (utan CONCURRENTLY)
CREATE INDEX IF NOT EXISTS idx_price_data_timestamp_desc 
  ON price_data(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_signals_active 
  ON signals(is_active, timestamp DESC) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_conditional_orders_pending 
  ON conditional_orders(status, user_id) 
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_technical_indicators_timestamp 
  ON technical_indicators(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_paper_trades_user_status 
  ON paper_trades(user_id, status);

CREATE INDEX IF NOT EXISTS idx_trade_queue_status 
  ON trade_execution_queue(status, created_at) 
  WHERE status = 'PENDING';

-- Atomär signal-skapande funktion för att undvika race conditions
CREATE OR REPLACE FUNCTION public.create_signal_atomic(
  p_signal_type TEXT,
  p_strength TEXT,
  p_confidence NUMERIC,
  p_probability_up NUMERIC,
  p_probability_down NUMERIC,
  p_current_price NUMERIC,
  p_target_price NUMERIC,
  p_stop_loss NUMERIC,
  p_reasoning TEXT,
  p_indicators_used JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signal_id UUID;
BEGIN
  -- Deaktivera alla aktiva signaler först (atomärt)
  UPDATE signals SET is_active = false WHERE is_active = true;
  
  -- Skapa ny signal
  INSERT INTO signals (
    signal_type, strength, confidence, probability_up, probability_down,
    current_price, target_price, stop_loss, reasoning, indicators_used,
    timestamp, is_active
  )
  VALUES (
    p_signal_type::signal_type, p_strength::signal_strength, p_confidence,
    p_probability_up, p_probability_down, p_current_price, p_target_price,
    p_stop_loss, p_reasoning, p_indicators_used, NOW(), true
  )
  RETURNING id INTO v_signal_id;
  
  RETURN v_signal_id;
END;
$$;-- Add columns for manual trading to paper_trades table
ALTER TABLE public.paper_trades 
ADD COLUMN IF NOT EXISTS instrument_type VARCHAR(10),
ADD COLUMN IF NOT EXISTS direction VARCHAR(10),
ADD COLUMN IF NOT EXISTS amount_sek DECIMAL,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_paper_trades_instrument_type ON public.paper_trades(instrument_type);
CREATE INDEX IF NOT EXISTS idx_paper_trades_direction ON public.paper_trades(direction);

-- Also add metadata column to trade_execution_queue if not exists
ALTER TABLE public.trade_execution_queue 
ADD COLUMN IF NOT EXISTS metadata JSONB;-- Add preferred instrument columns to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS preferred_bull_id VARCHAR(50) DEFAULT '2313155',
ADD COLUMN IF NOT EXISTS preferred_bear_id VARCHAR(50) DEFAULT '2313156';-- Tabell för användarens verktyg-inställningar
CREATE TABLE analysis_tool_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Verktyg on/off
  frequency_analyzer_enabled BOOLEAN DEFAULT true,
  momentum_pulse_enabled BOOLEAN DEFAULT true,
  volatility_window_enabled BOOLEAN DEFAULT true,
  micro_pattern_enabled BOOLEAN DEFAULT true,
  smart_exit_enabled BOOLEAN DEFAULT true,
  reversal_meter_enabled BOOLEAN DEFAULT true,
  timing_score_enabled BOOLEAN DEFAULT true,
  correlation_radar_enabled BOOLEAN DEFAULT true,
  risk_per_minute_enabled BOOLEAN DEFAULT true,
  
  -- Verktyg-specifika inställningar
  frequency_lookback_days INTEGER DEFAULT 30,
  momentum_sensitivity DECIMAL DEFAULT 1.0,
  volatility_window_hours INTEGER DEFAULT 168,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- RLS för analysis_tool_settings
ALTER TABLE analysis_tool_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tool settings"
  ON analysis_tool_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tool settings"
  ON analysis_tool_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tool settings"
  ON analysis_tool_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Tabell för frekvensanalys-resultat
CREATE TABLE frequency_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  
  interval_seconds INTEGER NOT NULL,
  interval_name VARCHAR(50) NOT NULL,
  
  accuracy_percent DECIMAL,
  return_percent DECIMAL,
  noise_ratio DECIMAL,
  trade_count INTEGER,
  optimal_score INTEGER,
  
  analysis_period_start TIMESTAMPTZ,
  analysis_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS för frequency_analysis_results
ALTER TABLE frequency_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own frequency results"
  ON frequency_analysis_results FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can insert frequency results"
  ON frequency_analysis_results FOR INSERT
  WITH CHECK (true);

-- Trigger för updated_at
CREATE TRIGGER update_analysis_tool_settings_updated_at
  BEFORE UPDATE ON analysis_tool_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();-- Fix: trades table has public read access - needs user_id column and user-scoped RLS

-- Step 1: Add user_id column to trades table
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Step 2: Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Public read access for trades" ON public.trades;

-- Step 3: Create user-scoped RLS policies
CREATE POLICY "Users can view own trades" 
ON public.trades 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" 
ON public.trades 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" 
ON public.trades 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" 
ON public.trades 
FOR DELETE 
USING (auth.uid() = user_id);

-- Step 4: Allow service role full access for edge functions
CREATE POLICY "Service role full access for trades" 
ON public.trades 
FOR ALL 
USING (true)
WITH CHECK (true);-- Make trading rules readable by all authenticated users
-- Keep INSERT/UPDATE/DELETE user-scoped

-- Drop the current user-only SELECT policy
DROP POLICY IF EXISTS "Users can view own rules" ON public.trading_rules;

-- Create new policy allowing all authenticated users to read all rules
CREATE POLICY "Authenticated users can view all rules" 
ON public.trading_rules 
FOR SELECT 
TO authenticated
USING (true);
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;-- Create storage bucket for data exports
INSERT INTO storage.buckets (id, name, public)
VALUES ('data-exports', 'data-exports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for data-exports bucket
CREATE POLICY "Users can view own exports files"
ON storage.objects FOR SELECT
USING (bucket_id = 'data-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Service role can upload exports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'data-exports');

CREATE POLICY "Service role can update exports"
ON storage.objects FOR UPDATE
USING (bucket_id = 'data-exports');

CREATE POLICY "Users can download own exports"
ON storage.objects FOR SELECT
USING (bucket_id = 'data-exports');-- ============================================
-- STEG 1: REGEL-BACKTEST SYSTEM
-- ============================================

-- Tabell för att spara backtest-resultat med detaljerad statistik
CREATE TABLE rule_backtest_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Regel-definition
  rule_id UUID REFERENCES trading_rules(id) ON DELETE SET NULL,
  rule_name VARCHAR(100) NOT NULL,
  rule_conditions JSONB NOT NULL,
  
  -- Testparametrar
  test_period_start TIMESTAMPTZ NOT NULL,
  test_period_end TIMESTAMPTZ NOT NULL,
  initial_capital_sek DECIMAL NOT NULL,
  position_size_sek DECIMAL NOT NULL,
  
  -- Resultat - Sammanfattning
  total_trades INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  losing_trades INTEGER NOT NULL DEFAULT 0,
  win_rate DECIMAL NOT NULL DEFAULT 0,
  
  total_profit_loss_sek DECIMAL NOT NULL DEFAULT 0,
  total_profit_loss_percent DECIMAL NOT NULL DEFAULT 0,
  
  gross_profit_sek DECIMAL NOT NULL DEFAULT 0,
  gross_loss_sek DECIMAL NOT NULL DEFAULT 0,
  profit_factor DECIMAL,
  
  best_trade_sek DECIMAL,
  worst_trade_sek DECIMAL,
  avg_trade_sek DECIMAL,
  
  max_drawdown_sek DECIMAL,
  max_drawdown_percent DECIMAL,
  
  avg_hold_duration_seconds INTEGER,
  
  -- Detaljerad data
  simulated_trades JSONB NOT NULL DEFAULT '[]'::jsonb,
  equity_curve JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  calculation_time_ms INTEGER,
  data_points_analyzed INTEGER,
  
  -- Status
  status VARCHAR(20) DEFAULT 'completed',
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index för snabba queries
CREATE INDEX idx_backtest_user ON rule_backtest_results(user_id, created_at DESC);
CREATE INDEX idx_backtest_rule ON rule_backtest_results(rule_id);
CREATE INDEX idx_backtest_profit ON rule_backtest_results(total_profit_loss_percent DESC);

-- Enable RLS
ALTER TABLE rule_backtest_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own backtests"
  ON rule_backtest_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own backtests"
  ON rule_backtest_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own backtests"
  ON rule_backtest_results FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON rule_backtest_results FOR ALL
  USING (true)
  WITH CHECK (true);-- =============================================
-- RULE ANALYSIS & RECOMMENDATIONS SYSTEM
-- =============================================

-- A) Tabell för att koppla trades till aktiva regler
CREATE TABLE public.trade_rule_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL,
  trade_type VARCHAR(20) NOT NULL, -- 'paper' eller 'live'
  active_rule_ids UUID[] NOT NULL DEFAULT '{}',
  rule_names TEXT[] NOT NULL DEFAULT '{}',
  rule_conditions JSONB NOT NULL DEFAULT '[]',
  triggered_rule_ids UUID[] DEFAULT '{}',
  profit_loss_sek DECIMAL,
  profit_loss_percent DECIMAL,
  hold_duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index för snabba analyser
CREATE INDEX idx_trade_rule_snapshot_rules ON trade_rule_snapshot USING GIN(active_rule_ids);
CREATE INDEX idx_trade_rule_snapshot_profit ON trade_rule_snapshot(profit_loss_percent);
CREATE INDEX idx_trade_rule_snapshot_trade ON trade_rule_snapshot(trade_id);

-- B) Prestanda-statistik per regel
CREATE TABLE public.rule_performance_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  rule_id UUID REFERENCES public.trading_rules(id) ON DELETE CASCADE,
  rule_name VARCHAR(200),
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  win_rate DECIMAL,
  total_profit_loss_sek DECIMAL DEFAULT 0,
  avg_profit_per_trade DECIMAL,
  avg_loss_per_trade DECIMAL,
  profit_factor DECIMAL,
  best_trade_sek DECIMAL,
  worst_trade_sek DECIMAL,
  avg_hold_duration_seconds INTEGER,
  first_trade_at TIMESTAMPTZ,
  last_trade_at TIMESTAMPTZ,
  performance_score INTEGER DEFAULT 0, -- 0-100
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, rule_id)
);

CREATE INDEX idx_rule_perf_user ON rule_performance_stats(user_id);
CREATE INDEX idx_rule_perf_score ON rule_performance_stats(user_id, performance_score DESC);

-- C) Statistik per regelkombination
CREATE TABLE public.rule_combination_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  rule_ids UUID[] NOT NULL,
  rule_names TEXT[] NOT NULL,
  combination_hash VARCHAR(64) NOT NULL,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  win_rate DECIMAL,
  total_profit_loss_sek DECIMAL DEFAULT 0,
  avg_profit_per_trade DECIMAL,
  profit_factor DECIMAL,
  improvement_vs_baseline_percent DECIMAL,
  combination_score INTEGER DEFAULT 0,
  sample_size_sufficient BOOLEAN DEFAULT false,
  confidence_level DECIMAL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, combination_hash)
);

CREATE INDEX idx_combination_score ON rule_combination_stats(user_id, combination_score DESC);

-- D) Rekommendationer
CREATE TABLE public.rule_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recommendation_type VARCHAR(30) NOT NULL, -- 'enable_rule', 'disable_rule', 'try_combination', 'adjust_parameter'
  rule_id UUID,
  rule_ids UUID[],
  current_value JSONB,
  suggested_value JSONB,
  reasoning TEXT NOT NULL,
  expected_improvement_percent DECIMAL,
  confidence_score INTEGER, -- 0-100
  supporting_data JSONB,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
  user_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  actioned_at TIMESTAMPTZ
);

CREATE INDEX idx_recommendations_user ON rule_recommendations(user_id);
CREATE INDEX idx_recommendations_status ON rule_recommendations(user_id, status);

-- RLS Policies
ALTER TABLE trade_rule_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_performance_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_combination_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_recommendations ENABLE ROW LEVEL SECURITY;

-- trade_rule_snapshot - join via paper_trades/trades
CREATE POLICY "Users can view own trade snapshots" ON trade_rule_snapshot 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM paper_trades WHERE paper_trades.id = trade_rule_snapshot.trade_id AND paper_trades.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM trades WHERE trades.id = trade_rule_snapshot.trade_id AND trades.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own trade snapshots" ON trade_rule_snapshot 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM paper_trades WHERE paper_trades.id = trade_id AND paper_trades.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM trades WHERE trades.id = trade_id AND trades.user_id = auth.uid())
  );

CREATE POLICY "Users can update own trade snapshots" ON trade_rule_snapshot 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM paper_trades WHERE paper_trades.id = trade_rule_snapshot.trade_id AND paper_trades.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM trades WHERE trades.id = trade_rule_snapshot.trade_id AND trades.user_id = auth.uid())
  );

-- Service role access for edge functions
CREATE POLICY "Service role full access trade_rule_snapshot" ON trade_rule_snapshot 
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- rule_performance_stats
CREATE POLICY "Users can view own rule stats" ON rule_performance_stats 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access rule_performance_stats" ON rule_performance_stats 
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- rule_combination_stats  
CREATE POLICY "Users can view own combination stats" ON rule_combination_stats 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access rule_combination_stats" ON rule_combination_stats 
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- rule_recommendations
CREATE POLICY "Users can manage own recommendations" ON rule_recommendations 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access rule_recommendations" ON rule_recommendations 
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');