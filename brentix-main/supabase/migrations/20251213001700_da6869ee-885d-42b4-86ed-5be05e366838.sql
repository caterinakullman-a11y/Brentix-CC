-- =============================================
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