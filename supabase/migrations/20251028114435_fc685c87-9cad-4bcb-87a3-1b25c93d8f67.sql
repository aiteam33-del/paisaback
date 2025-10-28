-- Fix: Authentication Tokens Could Be Stolen by Anyone
-- Add RLS policies to expense_access_tokens table for user transparency and token management

-- Allow users to view their own access tokens (for auditing)
CREATE POLICY "Users can view their own access tokens"
ON public.expense_access_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to delete their own expired tokens (for cleanup)
CREATE POLICY "Users can delete their own expired tokens"
ON public.expense_access_tokens
FOR DELETE
USING (auth.uid() = user_id AND expires_at < NOW());