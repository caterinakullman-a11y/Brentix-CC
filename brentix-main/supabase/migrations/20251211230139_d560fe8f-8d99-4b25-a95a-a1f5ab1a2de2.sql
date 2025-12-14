-- Add paper trading fields to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN paper_trading_enabled boolean DEFAULT true,
ADD COLUMN paper_balance numeric(12,2) DEFAULT 100000,
ADD COLUMN paper_starting_balance numeric(12,2) DEFAULT 100000;

-- Create paper_trades table
CREATE TABLE public.paper_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id uuid REFERENCES public.signals(id),
  entry_timestamp timestamptz NOT NULL,
  exit_timestamp timestamptz,
  entry_price numeric NOT NULL,
  exit_price numeric,
  quantity numeric NOT NULL,
  position_value_sek numeric NOT NULL,
  profit_loss_sek numeric,
  profit_loss_percent numeric,
  status text DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;

-- Users can only see their own paper trades
CREATE POLICY "Users can view own paper trades" ON public.paper_trades
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own paper trades
CREATE POLICY "Users can insert own paper trades" ON public.paper_trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own paper trades
CREATE POLICY "Users can update own paper trades" ON public.paper_trades
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own paper trades
CREATE POLICY "Users can delete own paper trades" ON public.paper_trades
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_paper_trades_updated_at
  BEFORE UPDATE ON public.paper_trades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();