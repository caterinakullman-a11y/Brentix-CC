
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
