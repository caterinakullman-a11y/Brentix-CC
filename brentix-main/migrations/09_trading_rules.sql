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
