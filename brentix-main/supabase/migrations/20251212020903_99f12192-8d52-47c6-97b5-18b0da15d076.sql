-- Kritiska index för prestanda (utan CONCURRENTLY)
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
$$;