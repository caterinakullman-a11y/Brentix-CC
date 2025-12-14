-- Add columns for manual trading to paper_trades table
ALTER TABLE public.paper_trades 
ADD COLUMN IF NOT EXISTS instrument_type VARCHAR(10),
ADD COLUMN IF NOT EXISTS direction VARCHAR(10),
ADD COLUMN IF NOT EXISTS amount_sek DECIMAL,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_paper_trades_instrument_type ON public.paper_trades(instrument_type);
CREATE INDEX IF NOT EXISTS idx_paper_trades_direction ON public.paper_trades(direction);

-- Also add metadata column to trade_execution_queue if not exists
ALTER TABLE public.trade_execution_queue 
ADD COLUMN IF NOT EXISTS metadata JSONB;