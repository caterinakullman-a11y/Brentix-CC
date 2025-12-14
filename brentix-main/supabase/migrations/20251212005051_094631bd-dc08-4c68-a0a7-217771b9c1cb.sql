-- Create trading_rules table for user-defined trading rules
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