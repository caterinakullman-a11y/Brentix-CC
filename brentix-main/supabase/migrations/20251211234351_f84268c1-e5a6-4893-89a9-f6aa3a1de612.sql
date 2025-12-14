-- Create error_logs table for tracking application errors
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  error_type VARCHAR(50) NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID,
  endpoint VARCHAR(255),
  severity VARCHAR(20) NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert errors (from edge functions)
CREATE POLICY "Service role can insert error_logs"
ON public.error_logs
FOR INSERT
WITH CHECK (true);

-- Allow authenticated users to insert their own errors
CREATE POLICY "Users can insert own error_logs"
ON public.error_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all error logs
CREATE POLICY "Admins can view error_logs"
ON public.error_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_error_logs_timestamp ON public.error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);