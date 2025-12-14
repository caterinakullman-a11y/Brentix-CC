-- ============================================
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
  WITH CHECK (true);