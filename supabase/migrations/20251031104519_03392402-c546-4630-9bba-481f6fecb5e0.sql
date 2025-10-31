-- Add RLS policy to allow employees to delete their own expenses within 10 minutes of creation
CREATE POLICY "Users can delete their own expenses within 10 minutes"
ON public.expenses
FOR DELETE
USING (
  auth.uid() = user_id 
  AND created_at > NOW() - INTERVAL '10 minutes'
);