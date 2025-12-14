-- Add onboarding tracking to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;