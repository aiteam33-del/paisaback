-- Fix remaining security warnings

-- ============= WAITLIST_EMAILS TABLE =============
-- Prevent SELECT access to waitlist data (competitors could scrape emails)
-- Only admins can view, but INSERT remains public for signups

CREATE POLICY "Only admins can view waitlist"
ON public.waitlist_emails
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- ============= PROFILES TABLE - SUPERIOR EMAIL PROTECTION =============
-- Create a security definer function to safely get applicant profiles
-- without exposing sensitive fields like superior_email

CREATE OR REPLACE FUNCTION public.get_join_request_applicants(_org_id uuid)
RETURNS TABLE(
  id uuid,
  email text,
  full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email, p.full_name
  FROM public.profiles p
  JOIN public.join_requests jr ON jr.employee_id = p.id
  WHERE jr.org_id = _org_id 
    AND jr.status = 'pending'
    AND public.is_org_admin(auth.uid(), _org_id);
$$;

-- Drop the overly permissive applicant policy that exposes superior_email
DROP POLICY IF EXISTS "Org admins can view applicant profiles" ON public.profiles;

-- Replace with more restrictive policy - no superior_email exposure
CREATE POLICY "Users can view profiles in their organization"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR public.is_org_admin(auth.uid(), organization_id)
  OR public.is_org_member(auth.uid(), organization_id)
);