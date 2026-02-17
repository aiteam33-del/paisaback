-- ============================================================
-- SECURITY FIX MIGRATION
-- 1. Make receipts bucket private
-- 2. Drop overly-permissive RLS policies (no org scope)
-- 3. Add proper org-scoped RLS for manager access
-- ============================================================

-- 1. MAKE RECEIPTS BUCKET PRIVATE
-- Remove the public access that was added in migration 20251106042149
UPDATE storage.buckets
SET public = false
WHERE id = 'receipts';

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Public read for receipts" ON storage.objects;

-- Ensure authenticated users can read their own receipts
-- (This may already exist, so use IF NOT EXISTS pattern via DO block)
DO $$
BEGIN
  -- Policy: users can read receipts they uploaded (path starts with their user_id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own receipts' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can read own receipts"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'receipts'
        AND auth.uid() IS NOT NULL
        AND (
          -- Owner can always read
          (storage.foldername(name))[1] = auth.uid()::text
          -- Or user has admin/manager role (can read all org receipts)
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'manager')
          OR public.has_role(auth.uid(), 'finance')
        )
      );
  END IF;
END $$;

-- 2. DROP OVERLY-PERMISSIVE EXPENSE RLS POLICIES
-- These allow ANY manager/admin to see ALL expenses across ALL orgs
DROP POLICY IF EXISTS "Managers can view all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Managers can update expense status" ON public.expenses;

-- 3. ENSURE ORG-SCOPED POLICIES EXIST
-- (These should already exist from migration 20251015055530, but let's be safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Org admins can view org expenses' AND tablename = 'expenses'
  ) THEN
    CREATE POLICY "Org admins can view org expenses"
      ON public.expenses FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          JOIN public.organizations o ON o.id = p.organization_id
          WHERE p.id = expenses.user_id
            AND o.admin_user_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.profiles caller
          JOIN public.profiles target ON target.organization_id = caller.organization_id
          WHERE caller.id = auth.uid()
            AND target.id = expenses.user_id
            AND (
              public.has_role(auth.uid(), 'manager')
              OR public.has_role(auth.uid(), 'finance')
              OR public.has_role(auth.uid(), 'admin')
            )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Org admins can update org expenses' AND tablename = 'expenses'
  ) THEN
    CREATE POLICY "Org admins can update org expenses"
      ON public.expenses FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          JOIN public.organizations o ON o.id = p.organization_id
          WHERE p.id = expenses.user_id
            AND o.admin_user_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.profiles caller
          JOIN public.profiles target ON target.organization_id = caller.organization_id
          WHERE caller.id = auth.uid()
            AND target.id = expenses.user_id
            AND (
              public.has_role(auth.uid(), 'manager')
              OR public.has_role(auth.uid(), 'finance')
              OR public.has_role(auth.uid(), 'admin')
            )
        )
      );
  END IF;
END $$;
