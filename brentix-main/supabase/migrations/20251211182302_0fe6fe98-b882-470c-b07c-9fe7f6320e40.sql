-- Fix security definer view by changing to SECURITY INVOKER
DROP VIEW IF EXISTS pending_trades;

CREATE VIEW pending_trades 
WITH (security_invoker = true)
AS
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