-- Add Avanza integration fields to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS avanza_account_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS avanza_instrument_id VARCHAR(50) DEFAULT '2313155',
ADD COLUMN IF NOT EXISTS position_size_sek DECIMAL(12,2) DEFAULT 1000;

-- Add auto execution fields to signals
ALTER TABLE signals 
ADD COLUMN IF NOT EXISTS auto_executed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS execution_result JSONB;