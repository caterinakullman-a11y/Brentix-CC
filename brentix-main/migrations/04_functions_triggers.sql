-- ============================================
-- PART 4: FUNCTIONS AND TRIGGERS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_trades_updated_at
    BEFORE UPDATE ON public.trades
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add Avanza integration fields to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS avanza_account_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS avanza_instrument_id VARCHAR(50) DEFAULT '2313155',
ADD COLUMN IF NOT EXISTS position_size_sek DECIMAL(12,2) DEFAULT 1000;

-- Add auto execution fields to signals
ALTER TABLE signals
ADD COLUMN IF NOT EXISTS auto_executed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS execution_result JSONB;
