-- Add comprehensive AI detection fields to expenses table
-- These fields match the requirements for SightEngine integration

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS ai_checked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_confidence FLOAT,
ADD COLUMN IF NOT EXISTS ai_checked_at TIMESTAMPTZ;

-- Add index for filtering AI-flagged expenses
CREATE INDEX IF NOT EXISTS idx_expenses_ai_flagged ON public.expenses(ai_flagged) WHERE ai_flagged = true;
CREATE INDEX IF NOT EXISTS idx_expenses_ai_checked ON public.expenses(ai_checked_at DESC) WHERE ai_checked = true;

-- Add comments for documentation
COMMENT ON COLUMN public.expenses.ai_checked IS 'Indicates if AI detection has been performed on this expense';
COMMENT ON COLUMN public.expenses.ai_flagged IS 'Indicates if the expense was flagged as AI-generated or manipulated (confidence >= 0.70)';
COMMENT ON COLUMN public.expenses.ai_confidence IS 'Confidence score from SightEngine (0.0 to 1.0)';
COMMENT ON COLUMN public.expenses.ai_checked_at IS 'Timestamp when AI detection was performed';

-- Migrate existing data: if is_ai_generated is true, set ai_flagged to true
UPDATE public.expenses 
SET ai_flagged = true, ai_checked = true
WHERE is_ai_generated = true AND ai_checked = false;

-- If ai_detection_result exists, extract confidence and set ai_checked
UPDATE public.expenses
SET ai_checked = true,
    ai_confidence = CASE 
      WHEN ai_detection_result->>'score' IS NOT NULL 
      THEN (ai_detection_result->>'score')::FLOAT
      ELSE NULL
    END
WHERE ai_detection_result IS NOT NULL AND ai_checked = false;

