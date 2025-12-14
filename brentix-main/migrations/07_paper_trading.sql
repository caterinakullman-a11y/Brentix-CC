-- ============================================
-- PART 7: PAPER TRADING & NOTIFICATIONS
-- ============================================

-- Add paper trading fields to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS show_loading_skeletons boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS paper_trading_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS paper_balance numeric(12,2) DEFAULT 100000,
ADD COLUMN IF NOT EXISTS paper_starting_balance numeric(12,2) DEFAULT 100000,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Paper trades table
CREATE TABLE public.paper_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id uuid REFERENCES public.signals(id),
  entry_timestamp timestamptz NOT NULL,
  exit_timestamp timestamptz,
  entry_price numeric NOT NULL,
  exit_price numeric,
  quantity numeric NOT NULL,
  position_value_sek numeric NOT NULL,
  profit_loss_sek numeric,
  profit_loss_percent numeric,
  status text DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own paper trades" ON public.paper_trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own paper trades" ON public.paper_trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own paper trades" ON public.paper_trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own paper trades" ON public.paper_trades FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_paper_trades_updated_at
  BEFORE UPDATE ON public.paper_trades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Error logs table
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  error_type VARCHAR(50) NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID,
  endpoint VARCHAR(255),
  severity VARCHAR(20) NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can insert error_logs" ON public.error_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can insert own error_logs" ON public.error_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admins can view error_logs" ON public.error_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_error_logs_timestamp ON public.error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('signal', 'trade', 'system', 'alert')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Add notification preferences
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS notify_new_signals BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_trade_executed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_daily_summary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_sound_enabled BOOLEAN DEFAULT true;

-- Signal notification function
CREATE OR REPLACE FUNCTION public.create_signal_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.signal_type IN ('BUY', 'SELL') AND NEW.is_active = TRUE THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT us.user_id, 'signal',
      CASE WHEN NEW.signal_type = 'BUY' THEN 'BUY Signal' ELSE 'SELL Signal' END,
      NEW.signal_type || ' signal - Confidence: ' || ROUND(NEW.confidence * 100) || '%',
      jsonb_build_object('signal_id', NEW.id, 'signal_type', NEW.signal_type, 'confidence', NEW.confidence)
    FROM user_settings us WHERE us.notify_new_signals = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_signal_notification ON public.signals;
CREATE TRIGGER on_new_signal_notification
  AFTER INSERT ON public.signals
  FOR EACH ROW EXECUTE FUNCTION public.create_signal_notification();
