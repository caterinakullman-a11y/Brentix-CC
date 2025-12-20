-- ============================================
-- NOTIFICATION SYSTEM - EXTENDED SCHEMA
-- ============================================

-- Global notification settings (admin controlled)
CREATE TABLE IF NOT EXISTS public.notification_settings_global (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    -- Global toggles
    push_notifications_enabled BOOLEAN DEFAULT TRUE,
    email_notifications_enabled BOOLEAN DEFAULT TRUE,
    in_app_notifications_enabled BOOLEAN DEFAULT TRUE,

    -- Event triggers
    notify_on_signals BOOLEAN DEFAULT TRUE,
    notify_on_trades BOOLEAN DEFAULT TRUE,
    notify_on_price_alerts BOOLEAN DEFAULT TRUE,
    notify_on_system_updates BOOLEAN DEFAULT TRUE,

    -- Signal settings
    signal_min_strength VARCHAR(20) DEFAULT 'STRONG', -- WEAK, MODERATE, STRONG
    signal_min_confidence INTEGER DEFAULT 70,

    -- Price alert thresholds
    price_change_threshold_percent DECIMAL(5,2) DEFAULT 2.0,
    price_alert_cooldown_minutes INTEGER DEFAULT 30,

    -- Rate limiting
    max_notifications_per_hour INTEGER DEFAULT 10,
    max_emails_per_day INTEGER DEFAULT 20,

    -- Metadata
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Insert default global settings
INSERT INTO public.notification_settings_global (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Notification log for tracking sent notifications
CREATE TABLE IF NOT EXISTS public.notification_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type VARCHAR(20) NOT NULL, -- 'push', 'email', 'in_app'
    event_type VARCHAR(50) NOT NULL, -- 'signal', 'trade', 'price_alert', 'system'
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'failed', 'pending'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON public.notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON public.notification_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON public.notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_log_event ON public.notification_log(event_type);

-- Push subscription storage (for Web Push)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Price alerts (user-defined)
CREATE TABLE IF NOT EXISTS public.price_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL, -- 'above', 'below', 'change_percent'
    target_value DECIMAL(10,4) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON public.price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON public.price_alerts(is_active) WHERE is_active = TRUE;

-- Add more columns to user_settings if they don't exist
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notification_sound_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME,
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME,
ADD COLUMN IF NOT EXISTS min_signal_strength VARCHAR(20) DEFAULT 'MODERATE';

-- RLS Policies
ALTER TABLE public.notification_settings_global ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Global settings - admins can update, all can read
DROP POLICY IF EXISTS "Anyone can read global settings" ON public.notification_settings_global;
CREATE POLICY "Anyone can read global settings" ON public.notification_settings_global
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update global settings" ON public.notification_settings_global;
CREATE POLICY "Admins can update global settings" ON public.notification_settings_global
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Notification log - users see own, admins see all
DROP POLICY IF EXISTS "Users can view own notification log" ON public.notification_log;
CREATE POLICY "Users can view own notification log" ON public.notification_log
FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Service role can insert notification log" ON public.notification_log;
CREATE POLICY "Service role can insert notification log" ON public.notification_log
FOR INSERT WITH CHECK (true);

-- Push subscriptions - users manage own
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions" ON public.push_subscriptions
FOR ALL USING (auth.uid() = user_id);

-- Price alerts - users manage own
DROP POLICY IF EXISTS "Users can manage own price alerts" ON public.price_alerts;
CREATE POLICY "Users can manage own price alerts" ON public.price_alerts
FOR ALL USING (auth.uid() = user_id);

-- Function to log notifications
CREATE OR REPLACE FUNCTION public.log_notification(
    p_user_id UUID,
    p_notification_type VARCHAR(20),
    p_event_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT DEFAULT NULL,
    p_data JSONB DEFAULT '{}',
    p_status VARCHAR(20) DEFAULT 'sent',
    p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.notification_log (user_id, notification_type, event_type, title, message, data, status, error_message)
    VALUES (p_user_id, p_notification_type, p_event_type, p_title, p_message, p_data, p_status, p_error_message)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
