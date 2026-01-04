-- Create verification history table
CREATE TABLE public.verification_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text_preview TEXT NOT NULL,
  full_text TEXT NOT NULL,
  trust_score INTEGER NOT NULL,
  claims JSONB NOT NULL DEFAULT '[]'::jsonb,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public read/write for now)
ALTER TABLE public.verification_history ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read history
CREATE POLICY "Anyone can view verification history"
  ON public.verification_history
  FOR SELECT
  USING (true);

-- Allow anyone to insert new verifications
CREATE POLICY "Anyone can create verification records"
  ON public.verification_history
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster ordering
CREATE INDEX idx_verification_history_created_at ON public.verification_history(created_at DESC);