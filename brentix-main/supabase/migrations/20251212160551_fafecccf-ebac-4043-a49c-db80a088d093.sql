-- Make trading rules readable by all authenticated users
-- Keep INSERT/UPDATE/DELETE user-scoped

-- Drop the current user-only SELECT policy
DROP POLICY IF EXISTS "Users can view own rules" ON public.trading_rules;

-- Create new policy allowing all authenticated users to read all rules
CREATE POLICY "Authenticated users can view all rules" 
ON public.trading_rules 
FOR SELECT 
TO authenticated
USING (true);
