-- Fix: trades table has public read access - needs user_id column and user-scoped RLS

-- Step 1: Add user_id column to trades table
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Step 2: Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Public read access for trades" ON public.trades;

-- Step 3: Create user-scoped RLS policies
CREATE POLICY "Users can view own trades" 
ON public.trades 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" 
ON public.trades 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" 
ON public.trades 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" 
ON public.trades 
FOR DELETE 
USING (auth.uid() = user_id);

-- Step 4: Allow service role full access for edge functions
CREATE POLICY "Service role full access for trades" 
ON public.trades 
FOR ALL 
USING (true)
WITH CHECK (true);