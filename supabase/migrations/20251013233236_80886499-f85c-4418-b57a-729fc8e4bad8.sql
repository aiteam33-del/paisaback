-- Create expense access tokens table for secure public expense viewing
CREATE TABLE public.expense_access_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_access_tokens ENABLE ROW LEVEL SECURITY;

-- Create index for faster token lookups
CREATE INDEX idx_expense_access_tokens_token ON public.expense_access_tokens(token);
CREATE INDEX idx_expense_access_tokens_expires_at ON public.expense_access_tokens(expires_at);

-- Policy: Only system can create tokens (edge functions)
CREATE POLICY "Service role can manage tokens"
ON public.expense_access_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Update expenses RLS to allow public access with valid token
-- This will be handled via edge function verification instead