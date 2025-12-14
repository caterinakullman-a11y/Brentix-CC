-- ============================================
-- BRENTIX - Trade Execution Queue Migration
-- ============================================

-- ============================================
-- 1. TRADE EXECUTION QUEUE: Create table
-- ============================================
CREATE TABLE IF NOT EXISTS trade_execution_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  UNIQUE(signal_id, user_id)
);

COMMENT ON TABLE trade_execution_queue IS 'Queue for pending auto-trade executions';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_queue_status ON trade_execution_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_created ON trade_execution_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_user ON trade_execution_queue(user_id);

-- Index for faster signal queries
CREATE INDEX IF NOT EXISTS idx_signals_auto_executed ON signals(auto_executed);

-- ============================================
-- 2. TRIGGER FUNCTION: Auto-queue on new signal
-- ============================================
CREATE OR REPLACE FUNCTION notify_new_signal()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process BUY or SELL signals that are active
  IF NEW.signal_type IN ('BUY', 'SELL') AND NEW.is_active = TRUE THEN
    -- Add to queue for all users with auto trading enabled
    INSERT INTO trade_execution_queue (signal_id, user_id, created_at, status)
    SELECT 
      NEW.id,
      us.user_id,
      NOW(),
      'PENDING'
    FROM user_settings us
    WHERE us.auto_trading_enabled = TRUE
      AND us.avanza_account_id IS NOT NULL
      AND us.avanza_account_id != ''
    ON CONFLICT (signal_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'New % signal queued for auto-trading: %', NEW.signal_type, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- 3. CREATE TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS on_new_signal ON signals;

CREATE TRIGGER on_new_signal
  AFTER INSERT ON signals
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_signal();

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE trade_execution_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role full access" ON trade_execution_queue;
DROP POLICY IF EXISTS "Users can view own queue items" ON trade_execution_queue;

-- Service role can do everything
CREATE POLICY "Service role full access" ON trade_execution_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own queue items (read-only)
CREATE POLICY "Users can view own queue items" ON trade_execution_queue
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- 5. GRANTS
-- ============================================
GRANT ALL ON trade_execution_queue TO service_role;
GRANT SELECT ON trade_execution_queue TO authenticated;

-- ============================================
-- 6. REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE trade_execution_queue;

-- ============================================
-- 7. HELPER VIEW: Active queue items
-- ============================================
CREATE OR REPLACE VIEW pending_trades AS
SELECT 
  q.id as queue_id,
  q.signal_id,
  q.user_id,
  q.status,
  q.created_at,
  s.signal_type,
  s.current_price,
  s.confidence,
  us.avanza_account_id,
  us.avanza_instrument_id,
  us.position_size_sek
FROM trade_execution_queue q
JOIN signals s ON q.signal_id = s.id
JOIN user_settings us ON q.user_id = us.user_id
WHERE q.status = 'PENDING';

GRANT SELECT ON pending_trades TO service_role;

-- ============================================
-- 8. CLEANUP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_queue_items(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM trade_execution_queue
  WHERE processed_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND status IN ('COMPLETED', 'FAILED');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;