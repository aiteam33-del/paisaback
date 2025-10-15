-- Fix infinite recursion in organizations table
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can create organizations" ON public.organizations;

-- Create a security definer function to check org membership
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND organization_id = _org_id
  )
$$;

-- Create new policies using the security definer function
CREATE POLICY "Users can view their organization"
ON public.organizations
FOR SELECT
USING (
  admin_user_id = auth.uid() 
  OR public.is_org_member(auth.uid(), id)
);

CREATE POLICY "Admins can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Admins can update their organization"
ON public.organizations
FOR UPDATE
USING (admin_user_id = auth.uid());

-- Fix profiles RLS policies to avoid recursion
DROP POLICY IF EXISTS "Org admins can view their employees" ON public.profiles;

CREATE POLICY "Org admins can view their employees"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR public.is_org_admin(auth.uid(), organization_id)
);