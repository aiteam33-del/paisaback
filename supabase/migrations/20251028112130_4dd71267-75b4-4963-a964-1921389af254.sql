-- Fix critical security issue: Remove public access to organizations table
-- and restrict admin_user_id exposure

-- Drop the overly permissive policy that exposes all organization data
DROP POLICY IF EXISTS "Anyone can view org names for joining" ON public.organizations;

-- Create a secure function that returns ONLY id and name for employee signup
-- This prevents exposure of admin_user_id and other sensitive fields
CREATE OR REPLACE FUNCTION public.get_organizations_for_joining()
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name
  FROM public.organizations
  ORDER BY name;
$$;

-- Allow authenticated users to view only their own organization (full details)
CREATE POLICY "Admins can view their own organization"
ON public.organizations
FOR SELECT
USING (admin_user_id = auth.uid());

-- Allow organization members to view their organization details
CREATE POLICY "Members can view their organization"
ON public.organizations
FOR SELECT
USING (public.is_org_member(auth.uid(), id));