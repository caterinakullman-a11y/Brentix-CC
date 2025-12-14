-- This migration will be run AFTER the user registers via /register
-- It sets the user as approved and grants admin role

-- First, let's create a function that can be called to promote a user to admin by email
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get user ID from profiles
  SELECT id INTO target_user_id FROM public.profiles WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Update profile to approved
  UPDATE public.profiles 
  SET status = 'approved', approved_at = NOW()
  WHERE id = target_user_id;
  
  -- Add admin role (upsert to avoid duplicates)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;