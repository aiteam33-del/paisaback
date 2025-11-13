-- Add AI detection fields to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS ai_detection_result jsonb,
ADD COLUMN IF NOT EXISTS is_ai_generated boolean DEFAULT false;

-- Add index for filtering AI-generated expenses
CREATE INDEX IF NOT EXISTS idx_expenses_ai_generated ON public.expenses(is_ai_generated) WHERE is_ai_generated = true;

-- Add comment for documentation
COMMENT ON COLUMN public.expenses.ai_detection_result IS 'Stores SightEngine API response including confidence scores and detection categories';
COMMENT ON COLUMN public.expenses.is_ai_generated IS 'Flag indicating if receipt image was detected as AI-generated or altered';