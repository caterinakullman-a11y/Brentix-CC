-- Create storage bucket for data exports
INSERT INTO storage.buckets (id, name, public)
VALUES ('data-exports', 'data-exports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for data-exports bucket
CREATE POLICY "Users can view own exports files"
ON storage.objects FOR SELECT
USING (bucket_id = 'data-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Service role can upload exports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'data-exports');

CREATE POLICY "Service role can update exports"
ON storage.objects FOR UPDATE
USING (bucket_id = 'data-exports');

CREATE POLICY "Users can download own exports"
ON storage.objects FOR SELECT
USING (bucket_id = 'data-exports');