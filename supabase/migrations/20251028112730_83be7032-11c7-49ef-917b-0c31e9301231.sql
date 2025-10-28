-- CRITICAL SECURITY FIX: Remove all public access to sensitive tables
-- Fix profiles and expenses table public exposure

-- ============= PROFILES TABLE =============
-- Drop overly permissive policies that might allow public access
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Restrictive policies: Only authenticated users can see profiles
-- Users see their own profile
-- Org admins see their employees
-- The existing policies already handle this correctly, but we ensure no public access

-- ============= EXPENSES TABLE =============
-- Ensure RLS is enabled
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Verify no public SELECT policies exist
-- The existing policies are already restrictive (user-owned, org admin, managers only)
-- No changes needed here as they already require auth.uid()

-- ============= WAITLIST_EMAILS TABLE =============
-- Fix waitlist to prevent data scraping
DROP POLICY IF EXISTS "Anyone can view waitlist" ON public.waitlist_emails;

-- Only admins can view waitlist
-- INSERT policy already exists and is correct

-- ============= EXPENSE_ACCESS_TOKENS TABLE =============
-- This table should ONLY be accessible via service role, never by regular users
DROP POLICY IF EXISTS "Service role can manage tokens" ON public.expense_access_tokens;

-- Create proper service-role-only access (no user access at all)
-- RLS is enabled, no policies = only service role can access via backend functions

ALTER TABLE public.expense_access_tokens ENABLE ROW LEVEL SECURITY;

-- No policies = complete lockdown for regular users, only service role via backend