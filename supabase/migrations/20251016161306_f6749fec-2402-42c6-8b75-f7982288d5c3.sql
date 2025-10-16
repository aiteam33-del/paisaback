-- Fix unique constraint on user_roles to allow multiple roles per user (unique by pair)
DO $$
BEGIN
  -- Drop incorrect/overly-restrictive unique constraint if it exists
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_user_role'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles DROP CONSTRAINT unique_user_role;
  END IF;
END $$;

-- Ensure the correct unique constraint on (user_id, role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_user_id_role_unique'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role);
  END IF;
END $$;

-- Helpful index for lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Safety: keep grant_admin_on_org_create behavior idempotent
-- (It already uses ON CONFLICT (user_id, role) DO NOTHING in function definition.)
