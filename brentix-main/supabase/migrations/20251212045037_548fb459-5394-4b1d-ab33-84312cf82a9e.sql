-- Tabell för användarens verktyg-inställningar
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
  EXECUTE FUNCTION update_updated_at_column();