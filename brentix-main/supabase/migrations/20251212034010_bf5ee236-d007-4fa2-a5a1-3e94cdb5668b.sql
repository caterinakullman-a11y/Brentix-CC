-- Add preferred instrument columns to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS preferred_bull_id VARCHAR(50) DEFAULT '2313155',
ADD COLUMN IF NOT EXISTS preferred_bear_id VARCHAR(50) DEFAULT '2313156';