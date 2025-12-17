-- RecycleX Schema Migration
-- Automated trading strategy for Bull & Bear certificates

-- ============================================
-- TABLE: recyclex_rules
-- Main strategy configuration table
-- ============================================
CREATE TABLE IF NOT EXISTS public.recyclex_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('BULL', 'BEAR')),
  status TEXT NOT NULL DEFAULT 'INACTIVE' CHECK (status IN ('INACTIVE', 'WAITING', 'ACTIVE', 'COMPLETED', 'STOPPED', 'PAUSED')),
  start_mode TEXT NOT NULL DEFAULT 'MANUAL' CHECK (start_mode IN ('MANUAL', 'AUTO')),
  auto_start_price DECIMAL,
  auto_start_tolerance DECIMAL DEFAULT 0.2,
  config JSONB NOT NULL DEFAULT '{
    "referencePrice": 0,
    "capital": 10000,
    "orderCount": 1,
    "orderSpread": 0,
    "targetPercent": 25.71,
    "stopLossPercent": 10,
    "targetCycles": 28,
    "capitalMode": "COMPOUND",
    "cycleRestartMode": "CURRENT_PRICE",
    "cycleRestartTolerance": 0.2,
    "feePerTrade": 0,
    "feePercent": 0,
    "maxCycleDuration": null,
    "closeBeforeMarketClose": false,
    "closeBeforeMinutes": 15
  }'::jsonb,
  state JSONB NOT NULL DEFAULT '{
    "currentCycle": 0,
    "completedCycles": 0,
    "totalProfit": 0,
    "totalFees": 0,
    "currentCapital": 0,
    "initialCapital": 0,
    "lastError": null
  }'::jsonb,
  linked_rule_id UUID REFERENCES public.recyclex_rules(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: recyclex_positions
-- Active and historical positions for each rule
-- ============================================
CREATE TABLE IF NOT EXISTS public.recyclex_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.recyclex_rules(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  expected_buy_price DECIMAL,
  actual_buy_price DECIMAL,
  quantity DECIMAL,
  invested_amount DECIMAL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'OPEN', 'CLOSING', 'CLOSED')),
  target_price DECIMAL,
  stop_loss_price DECIMAL,
  sell_price DECIMAL,
  gross_profit DECIMAL,
  fees DECIMAL,
  net_profit DECIMAL,
  closed_reason TEXT CHECK (closed_reason IN ('TARGET', 'STOPLOSS', 'TIMEOUT', 'MARKET_CLOSE', 'MANUAL')),
  buy_filled_at TIMESTAMPTZ,
  sell_filled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: recyclex_cycles
-- Completed cycle history for each rule
-- ============================================
CREATE TABLE IF NOT EXISTS public.recyclex_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.recyclex_rules(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  start_capital DECIMAL,
  end_capital DECIMAL,
  gross_profit DECIMAL,
  fees DECIMAL,
  net_profit DECIMAL,
  profit_percent DECIMAL,
  result TEXT CHECK (result IN ('WIN', 'LOSS', 'TIMEOUT', 'MANUAL')),
  reference_price DECIMAL,
  positions_snapshot JSONB
);

-- ============================================
-- TABLE: recyclex_suggestions
-- Counterpart rule suggestions (Bull <-> Bear)
-- ============================================
CREATE TABLE IF NOT EXISTS public.recyclex_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  triggered_by UUID NOT NULL REFERENCES public.recyclex_rules(id) ON DELETE CASCADE,
  suggested_type TEXT NOT NULL CHECK (suggested_type IN ('BULL', 'BEAR')),
  suggested_config JSONB,
  message TEXT,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_recyclex_rules_user_id ON public.recyclex_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_recyclex_rules_status ON public.recyclex_rules(status);
CREATE INDEX IF NOT EXISTS idx_recyclex_rules_user_status ON public.recyclex_rules(user_id, status);
CREATE INDEX IF NOT EXISTS idx_recyclex_positions_rule_id ON public.recyclex_positions(rule_id);
CREATE INDEX IF NOT EXISTS idx_recyclex_positions_status ON public.recyclex_positions(status);
CREATE INDEX IF NOT EXISTS idx_recyclex_cycles_rule_id ON public.recyclex_cycles(rule_id);
CREATE INDEX IF NOT EXISTS idx_recyclex_suggestions_user_id ON public.recyclex_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_recyclex_suggestions_dismissed ON public.recyclex_suggestions(user_id, dismissed);

-- ============================================
-- TRIGGERS: updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_recyclex_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_recyclex_rules_updated_at ON public.recyclex_rules;
CREATE TRIGGER update_recyclex_rules_updated_at
  BEFORE UPDATE ON public.recyclex_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_recyclex_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.recyclex_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recyclex_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recyclex_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recyclex_suggestions ENABLE ROW LEVEL SECURITY;

-- recyclex_rules policies
DROP POLICY IF EXISTS "Users can view own recyclex rules" ON public.recyclex_rules;
CREATE POLICY "Users can view own recyclex rules" ON public.recyclex_rules
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recyclex rules" ON public.recyclex_rules;
CREATE POLICY "Users can insert own recyclex rules" ON public.recyclex_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own recyclex rules" ON public.recyclex_rules;
CREATE POLICY "Users can update own recyclex rules" ON public.recyclex_rules
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recyclex rules" ON public.recyclex_rules;
CREATE POLICY "Users can delete own recyclex rules" ON public.recyclex_rules
  FOR DELETE USING (auth.uid() = user_id);

-- recyclex_positions policies (via rule ownership)
DROP POLICY IF EXISTS "Users can view own recyclex positions" ON public.recyclex_positions;
CREATE POLICY "Users can view own recyclex positions" ON public.recyclex_positions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.recyclex_rules
      WHERE id = recyclex_positions.rule_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own recyclex positions" ON public.recyclex_positions;
CREATE POLICY "Users can insert own recyclex positions" ON public.recyclex_positions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recyclex_rules
      WHERE id = recyclex_positions.rule_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own recyclex positions" ON public.recyclex_positions;
CREATE POLICY "Users can update own recyclex positions" ON public.recyclex_positions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.recyclex_rules
      WHERE id = recyclex_positions.rule_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own recyclex positions" ON public.recyclex_positions;
CREATE POLICY "Users can delete own recyclex positions" ON public.recyclex_positions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.recyclex_rules
      WHERE id = recyclex_positions.rule_id AND user_id = auth.uid()
    )
  );

-- recyclex_cycles policies (via rule ownership)
DROP POLICY IF EXISTS "Users can view own recyclex cycles" ON public.recyclex_cycles;
CREATE POLICY "Users can view own recyclex cycles" ON public.recyclex_cycles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.recyclex_rules
      WHERE id = recyclex_cycles.rule_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own recyclex cycles" ON public.recyclex_cycles;
CREATE POLICY "Users can insert own recyclex cycles" ON public.recyclex_cycles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recyclex_rules
      WHERE id = recyclex_cycles.rule_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own recyclex cycles" ON public.recyclex_cycles;
CREATE POLICY "Users can update own recyclex cycles" ON public.recyclex_cycles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.recyclex_rules
      WHERE id = recyclex_cycles.rule_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own recyclex cycles" ON public.recyclex_cycles;
CREATE POLICY "Users can delete own recyclex cycles" ON public.recyclex_cycles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.recyclex_rules
      WHERE id = recyclex_cycles.rule_id AND user_id = auth.uid()
    )
  );

-- recyclex_suggestions policies
DROP POLICY IF EXISTS "Users can view own recyclex suggestions" ON public.recyclex_suggestions;
CREATE POLICY "Users can view own recyclex suggestions" ON public.recyclex_suggestions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recyclex suggestions" ON public.recyclex_suggestions;
CREATE POLICY "Users can insert own recyclex suggestions" ON public.recyclex_suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own recyclex suggestions" ON public.recyclex_suggestions;
CREATE POLICY "Users can update own recyclex suggestions" ON public.recyclex_suggestions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recyclex suggestions" ON public.recyclex_suggestions;
CREATE POLICY "Users can delete own recyclex suggestions" ON public.recyclex_suggestions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.recyclex_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recyclex_positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recyclex_suggestions;
