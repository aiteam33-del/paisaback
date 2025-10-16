-- Fix expenses.status constraint to allow approvals
-- 1) Normalize existing data to valid statuses
UPDATE public.expenses
SET status = 'pending'
WHERE status IS NULL OR status NOT IN ('pending','approved','rejected','paid');

-- 2) Drop old check constraint if it exists
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_status_check;

-- 3) Recreate constraint with allowed values
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_status_check
  CHECK (status IN ('pending','approved','rejected','paid'));
