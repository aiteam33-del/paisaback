-- Phase 1: Critical Bug Fixes - Database Schema Improvements

-- 1. Add unique constraint to prevent duplicate user roles
-- First, we need to handle any existing duplicates by keeping only the highest privilege role
DO $$ 
DECLARE
  duplicate_user RECORD;
BEGIN
  -- For each user with duplicate roles, keep only the highest privilege role
  FOR duplicate_user IN 
    SELECT user_id, array_agg(role ORDER BY 
      CASE role::text
        WHEN 'admin' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'finance' THEN 3
        WHEN 'employee' THEN 4
        ELSE 5
      END
    ) as roles
    FROM public.user_roles
    GROUP BY user_id
    HAVING count(*) > 1
  LOOP
    -- Delete all but the first (highest privilege) role
    DELETE FROM public.user_roles
    WHERE user_id = duplicate_user.user_id
      AND role != duplicate_user.roles[1];
  END LOOP;
END $$;

-- Now add the unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_role'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT unique_user_role UNIQUE(user_id);
  END IF;
END $$;

-- 2. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_status ON public.expenses(user_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_org_status ON public.expenses(user_id, status) 
  WHERE status IN ('pending', 'approved', 'rejected');
CREATE INDEX IF NOT EXISTS idx_join_requests_org_status ON public.join_requests(org_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id) WHERE organization_id IS NOT NULL;

-- 3. Add audit and tracking fields to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ocr_confidence FLOAT,
ADD COLUMN IF NOT EXISTS ocr_error TEXT,
ADD COLUMN IF NOT EXISTS ocr_retry_count INT DEFAULT 0;

-- Add check constraint for ocr_confidence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_ocr_confidence'
  ) THEN
    ALTER TABLE public.expenses 
    ADD CONSTRAINT check_ocr_confidence CHECK (ocr_confidence IS NULL OR (ocr_confidence >= 0 AND ocr_confidence <= 1));
  END IF;
END $$;

-- 4. Add constraints for data validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'positive_amount'
  ) THEN
    ALTER TABLE public.expenses ADD CONSTRAINT positive_amount CHECK (amount > 0);
  END IF;
END $$;

-- 5. Add rejection reason to join_requests
ALTER TABLE public.join_requests
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- 6. Create function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_highest_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role::text
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'finance' THEN 3
      WHEN 'employee' THEN 4
      ELSE 5
    END
  LIMIT 1
$$;

-- 7. Update reject_join_request to handle rejection reason
CREATE OR REPLACE FUNCTION public.reject_join_request(request_id uuid, reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.join_requests
  SET 
    status = 'rejected', 
    updated_at = now(),
    rejection_reason = reason,
    rejected_by = auth.uid(),
    rejected_at = now()
  WHERE id = request_id AND status = 'pending';
  
  RETURN FOUND;
END;
$function$;