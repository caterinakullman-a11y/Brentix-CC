-- Add loading skeletons preference to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN show_loading_skeletons boolean DEFAULT true;