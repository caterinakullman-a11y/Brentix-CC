-- ============================================
-- PART 3: ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equity_curve ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- User settings policies
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public read policies for market data
CREATE POLICY "Public read access for price_data" ON public.price_data FOR SELECT USING (true);
CREATE POLICY "Public read access for technical_indicators" ON public.technical_indicators FOR SELECT USING (true);
CREATE POLICY "Public read access for signals" ON public.signals FOR SELECT USING (true);
CREATE POLICY "Public read access for equity_curve" ON public.equity_curve FOR SELECT USING (true);
CREATE POLICY "Public read access for market_events" ON public.market_events FOR SELECT USING (true);
CREATE POLICY "Public read access for patterns" ON public.patterns FOR SELECT USING (true);
CREATE POLICY "Public read access for ml_predictions" ON public.ml_predictions FOR SELECT USING (true);
CREATE POLICY "Public read access for daily_reports" ON public.daily_reports FOR SELECT USING (true);

-- Service role INSERT policies
CREATE POLICY "Service role can insert price_data" ON public.price_data
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can insert technical_indicators" ON public.technical_indicators
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can insert signals" ON public.signals
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can update signals" ON public.signals
    FOR UPDATE TO service_role USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_events;
