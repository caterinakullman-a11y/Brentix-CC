-- Add tracking fields to conditional_orders for trailing stop
ALTER TABLE public.conditional_orders 
ADD COLUMN IF NOT EXISTS peak_price numeric,
ADD COLUMN IF NOT EXISTS trough_price numeric,
ADD COLUMN IF NOT EXISTS initial_trigger_price numeric;