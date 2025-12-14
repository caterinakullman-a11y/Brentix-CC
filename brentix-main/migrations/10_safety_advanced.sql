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
