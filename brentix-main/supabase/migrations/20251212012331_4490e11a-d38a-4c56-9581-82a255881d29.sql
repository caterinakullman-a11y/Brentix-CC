-- Phase 6: Safety & Orders - Create tables for emergency stops, auto-triggers, and conditional orders

-- Table for emergency stop settings
CREATE TABLE public.emergency_stops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT false,
  triggered_at TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  close_all_positions BOOLEAN DEFAULT true,
  disable_auto_trading BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for auto-triggers (max loss limits, daily limits, etc.)
CREATE TABLE public.auto_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  trigger_type VARCHAR NOT NULL, -- 'MAX_DAILY_LOSS', 'MAX_POSITION_LOSS', 'MAX_DRAWDOWN', 'PROFIT_TARGET'
  threshold_value NUMERIC NOT NULL,
  threshold_type VARCHAR NOT NULL DEFAULT 'PERCENT', -- 'PERCENT' or 'ABSOLUTE'
  action VARCHAR NOT NULL, -- 'CLOSE_POSITION', 'CLOSE_ALL', 'STOP_TRADING', 'NOTIFY'
  is_active BOOLEAN DEFAULT true,
  triggered_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for conditional orders
CREATE TABLE public.conditional_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instrument_id UUID REFERENCES instruments(id),
  order_type VARCHAR NOT NULL, -- 'LIMIT', 'STOP', 'STOP_LIMIT', 'TRAILING_STOP'
  direction VARCHAR NOT NULL, -- 'BUY', 'SELL'
  trigger_price NUMERIC,
  limit_price NUMERIC,
  quantity NUMERIC NOT NULL,
  trailing_percent NUMERIC,
  status VARCHAR DEFAULT 'PENDING', -- 'PENDING', 'TRIGGERED', 'EXECUTED', 'CANCELLED', 'EXPIRED'
  expires_at TIMESTAMP WITH TIME ZONE,
  triggered_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  execution_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.emergency_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conditional_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emergency_stops
CREATE POLICY "Users can view own emergency stops" ON public.emergency_stops FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own emergency stops" ON public.emergency_stops FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own emergency stops" ON public.emergency_stops FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own emergency stops" ON public.emergency_stops FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for auto_triggers
CREATE POLICY "Users can view own auto triggers" ON public.auto_triggers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own auto triggers" ON public.auto_triggers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own auto triggers" ON public.auto_triggers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own auto triggers" ON public.auto_triggers FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for conditional_orders
CREATE POLICY "Users can view own conditional orders" ON public.conditional_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conditional orders" ON public.conditional_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conditional orders" ON public.conditional_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conditional orders" ON public.conditional_orders FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_emergency_stops_updated_at BEFORE UPDATE ON public.emergency_stops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_auto_triggers_updated_at BEFORE UPDATE ON public.auto_triggers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conditional_orders_updated_at BEFORE UPDATE ON public.conditional_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for instruments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.instruments;