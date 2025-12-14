-- Create notifications table
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

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Add notification preferences to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS notify_new_signals BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_trade_executed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_daily_summary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_sound_enabled BOOLEAN DEFAULT true;

-- Create function to auto-create notification on new signal
CREATE OR REPLACE FUNCTION public.create_signal_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only for BUY or SELL signals
  IF NEW.signal_type IN ('BUY', 'SELL') AND NEW.is_active = TRUE THEN
    -- Create notification for all users with notify_new_signals enabled
    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT 
      us.user_id,
      'signal',
      CASE WHEN NEW.signal_type = 'BUY' THEN '🟢 BUY Signal' ELSE '🔴 SELL Signal' END,
      NEW.signal_type || ' signal generated - Confidence: ' || ROUND(NEW.confidence * 100) || '%',
      jsonb_build_object('signal_id', NEW.id, 'signal_type', NEW.signal_type, 'confidence', NEW.confidence)
    FROM user_settings us
    WHERE us.notify_new_signals = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for signal notifications
DROP TRIGGER IF EXISTS on_new_signal_notification ON public.signals;
CREATE TRIGGER on_new_signal_notification
  AFTER INSERT ON public.signals
  FOR EACH ROW
  EXECUTE FUNCTION public.create_signal_notification();