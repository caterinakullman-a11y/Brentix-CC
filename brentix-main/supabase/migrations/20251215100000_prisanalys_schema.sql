-- Prisanalys Schema Migration
-- Creates VIEW for temporal analysis and AI suggestions table

-- ============================================
-- 1. VIEW for Temporal Price Analysis
-- ============================================
-- This VIEW adds computed temporal columns to price_data without duplicating data

CREATE OR REPLACE VIEW brent_price_analysis AS
SELECT
  id,
  timestamp,
  open,
  high,
  low,
  close,
  volume,
  source,
  data_quality,
  created_at,
  -- Temporal decomposition fields
  EXTRACT(DOW FROM timestamp)::INTEGER AS day_of_week,        -- 0=Sunday, 6=Saturday
  EXTRACT(HOUR FROM timestamp)::INTEGER AS hour_of_day,       -- 0-23
  EXTRACT(MINUTE FROM timestamp)::INTEGER AS minute_of_hour,  -- 0-59
  EXTRACT(DAY FROM timestamp)::INTEGER AS day_of_month,       -- 1-31
  EXTRACT(WEEK FROM timestamp)::INTEGER AS week_of_year,      -- 1-53
  EXTRACT(MONTH FROM timestamp)::INTEGER AS month_of_year,    -- 1-12
  EXTRACT(YEAR FROM timestamp)::INTEGER AS year,              -- e.g., 2025
  DATE(timestamp) AS date_only,                               -- Date without time
  -- Computed price metrics
  (close - open) AS price_change,
  CASE WHEN open > 0 THEN ((close - open) / open * 100) ELSE 0 END AS price_change_percent,
  (high - low) AS price_range,
  CASE WHEN (high - low) > 0 THEN ((close - low) / (high - low)) ELSE 0.5 END AS close_position,
  -- Trading session flags
  CASE
    WHEN EXTRACT(DOW FROM timestamp) IN (0, 6) THEN false
    WHEN EXTRACT(HOUR FROM timestamp) BETWEEN 7 AND 21 THEN true
    ELSE false
  END AS is_market_hours,
  CASE WHEN EXTRACT(DOW FROM timestamp) IN (0, 6) THEN true ELSE false END AS is_weekend
FROM price_data;

-- Grant access to the view
GRANT SELECT ON brent_price_analysis TO authenticated;
GRANT SELECT ON brent_price_analysis TO anon;

-- ============================================
-- 2. AI Suggestions Table
-- ============================================

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Suggestion details
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('rule', 'pattern', 'timing', 'optimization', 'entry', 'exit')),
  analysis_mode TEXT NOT NULL DEFAULT 'pattern' CHECK (analysis_mode IN ('pattern', 'ml')),
  title TEXT NOT NULL,
  description TEXT,

  -- Confidence and metrics
  confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  expected_return DECIMAL(8,4),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),

  -- Supporting data
  supporting_data JSONB DEFAULT '{}',
  suggested_rule JSONB,
  historical_performance JSONB DEFAULT '{}',

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed', 'expired')),
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,

  -- User feedback
  feedback TEXT,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),

  CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_status ON ai_suggestions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type ON ai_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_mode ON ai_suggestions(analysis_mode);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created ON ai_suggestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_priority ON ai_suggestions(status, priority DESC) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own suggestions"
  ON ai_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions"
  ON ai_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own suggestions"
  ON ai_suggestions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert suggestions"
  ON ai_suggestions FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 3. Statistical Functions
-- ============================================

-- Get hourly statistics for price analysis
CREATE OR REPLACE FUNCTION get_hourly_statistics(
  p_start_date TIMESTAMPTZ DEFAULT now() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  hour_of_day INTEGER,
  avg_price DECIMAL,
  avg_price_change DECIMAL,
  avg_price_change_percent DECIMAL,
  avg_volume DECIMAL,
  avg_range DECIMAL,
  sample_count BIGINT,
  up_count BIGINT,
  down_count BIGINT,
  up_probability DECIMAL,
  avg_up_move DECIMAL,
  avg_down_move DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM timestamp)::INTEGER as hour_of_day,
    AVG(close) as avg_price,
    AVG(close - open) as avg_price_change,
    AVG(CASE WHEN open > 0 THEN ((close - open) / open * 100) ELSE 0 END) as avg_price_change_percent,
    AVG(COALESCE(volume, 0)) as avg_volume,
    AVG(high - low) as avg_range,
    COUNT(*) as sample_count,
    COUNT(*) FILTER (WHERE close > open) as up_count,
    COUNT(*) FILTER (WHERE close < open) as down_count,
    (COUNT(*) FILTER (WHERE close > open)::DECIMAL / NULLIF(COUNT(*), 0) * 100) as up_probability,
    AVG(CASE WHEN close > open THEN close - open ELSE NULL END) as avg_up_move,
    AVG(CASE WHEN close < open THEN open - close ELSE NULL END) as avg_down_move
  FROM price_data
  WHERE timestamp BETWEEN p_start_date AND p_end_date
  GROUP BY EXTRACT(HOUR FROM timestamp)
  ORDER BY hour_of_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get daily (day of week) statistics
CREATE OR REPLACE FUNCTION get_daily_statistics(
  p_start_date TIMESTAMPTZ DEFAULT now() - INTERVAL '90 days',
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  day_of_week INTEGER,
  day_name TEXT,
  avg_price DECIMAL,
  avg_price_change DECIMAL,
  avg_price_change_percent DECIMAL,
  avg_volume DECIMAL,
  avg_range DECIMAL,
  sample_count BIGINT,
  up_probability DECIMAL,
  volatility DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(DOW FROM timestamp)::INTEGER as day_of_week,
    CASE EXTRACT(DOW FROM timestamp)::INTEGER
      WHEN 0 THEN 'Sunday'
      WHEN 1 THEN 'Monday'
      WHEN 2 THEN 'Tuesday'
      WHEN 3 THEN 'Wednesday'
      WHEN 4 THEN 'Thursday'
      WHEN 5 THEN 'Friday'
      WHEN 6 THEN 'Saturday'
    END as day_name,
    AVG(close) as avg_price,
    AVG(close - open) as avg_price_change,
    AVG(CASE WHEN open > 0 THEN ((close - open) / open * 100) ELSE 0 END) as avg_price_change_percent,
    AVG(COALESCE(volume, 0)) as avg_volume,
    AVG(high - low) as avg_range,
    COUNT(*) as sample_count,
    (COUNT(*) FILTER (WHERE close > open)::DECIMAL / NULLIF(COUNT(*), 0) * 100) as up_probability,
    STDDEV(close - open) as volatility
  FROM price_data
  WHERE timestamp BETWEEN p_start_date AND p_end_date
  GROUP BY EXTRACT(DOW FROM timestamp)
  ORDER BY day_of_week;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get price statistics for a given time period
CREATE OR REPLACE FUNCTION get_price_statistics(
  p_start_date TIMESTAMPTZ DEFAULT now() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  total_records BIGINT,
  min_price DECIMAL,
  max_price DECIMAL,
  avg_price DECIMAL,
  price_std_dev DECIMAL,
  total_volume DECIMAL,
  avg_daily_range DECIMAL,
  up_days BIGINT,
  down_days BIGINT,
  unchanged_days BIGINT,
  max_up_move DECIMAL,
  max_down_move DECIMAL,
  avg_up_move DECIMAL,
  avg_down_move DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_records,
    MIN(close) as min_price,
    MAX(close) as max_price,
    AVG(close) as avg_price,
    STDDEV(close) as price_std_dev,
    SUM(COALESCE(volume, 0)) as total_volume,
    AVG(high - low) as avg_daily_range,
    COUNT(*) FILTER (WHERE close > open) as up_days,
    COUNT(*) FILTER (WHERE close < open) as down_days,
    COUNT(*) FILTER (WHERE close = open) as unchanged_days,
    MAX(CASE WHEN close > open THEN close - open ELSE 0 END) as max_up_move,
    MAX(CASE WHEN close < open THEN open - close ELSE 0 END) as max_down_move,
    AVG(CASE WHEN close > open THEN close - open ELSE NULL END) as avg_up_move,
    AVG(CASE WHEN close < open THEN open - close ELSE NULL END) as avg_down_move
  FROM price_data
  WHERE timestamp BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get hour-day heatmap data
CREATE OR REPLACE FUNCTION get_hour_day_heatmap(
  p_start_date TIMESTAMPTZ DEFAULT now() - INTERVAL '90 days',
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  day_of_week INTEGER,
  hour_of_day INTEGER,
  avg_price_change_percent DECIMAL,
  up_probability DECIMAL,
  sample_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(DOW FROM timestamp)::INTEGER as day_of_week,
    EXTRACT(HOUR FROM timestamp)::INTEGER as hour_of_day,
    AVG(CASE WHEN open > 0 THEN ((close - open) / open * 100) ELSE 0 END) as avg_price_change_percent,
    (COUNT(*) FILTER (WHERE close > open)::DECIMAL / NULLIF(COUNT(*), 0) * 100) as up_probability,
    COUNT(*) as sample_count
  FROM price_data
  WHERE timestamp BETWEEN p_start_date AND p_end_date
  GROUP BY EXTRACT(DOW FROM timestamp), EXTRACT(HOUR FROM timestamp)
  ORDER BY day_of_week, hour_of_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_hourly_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_price_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_hour_day_heatmap TO authenticated;

-- ============================================
-- 4. ML Model Training Status Table
-- ============================================

CREATE TABLE IF NOT EXISTS ml_model_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('training', 'ready', 'failed', 'outdated')),

  -- Training metrics
  training_started_at TIMESTAMPTZ,
  training_completed_at TIMESTAMPTZ,
  training_data_start TIMESTAMPTZ,
  training_data_end TIMESTAMPTZ,
  training_samples BIGINT,

  -- Model performance
  accuracy DECIMAL(5,4),
  precision_score DECIMAL(5,4),
  recall_score DECIMAL(5,4),
  f1_score DECIMAL(5,4),

  -- Metadata
  model_config JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for latest model lookup
CREATE INDEX IF NOT EXISTS idx_ml_model_status_name ON ml_model_status(model_name, created_at DESC);

-- RLS for ml_model_status (read-only for users)
ALTER TABLE ml_model_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view model status"
  ON ml_model_status FOR SELECT
  USING (true);

GRANT SELECT ON ml_model_status TO authenticated;
