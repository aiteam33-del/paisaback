-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  admin_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Add organization_id to profiles table FIRST
ALTER TABLE public.profiles
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);

-- RLS Policies for organizations (now that organization_id exists in profiles)
CREATE POLICY "Users can view their own organization"
ON public.organizations
FOR SELECT
USING (
  admin_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.organization_id = organizations.id
  )
);

CREATE POLICY "Admins can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (auth.uid() = admin_user_id);

CREATE POLICY "Admins can update their organization"
ON public.organizations
FOR UPDATE
USING (admin_user_id = auth.uid());

-- Add trigger for updated_at on organizations
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function to check if user is org admin
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = _org_id AND admin_user_id = _user_id
  )
$$;

-- Update profiles RLS to allow org admins to view employees
CREATE POLICY "Org admins can view their employees"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = profiles.organization_id
    AND organizations.admin_user_id = auth.uid()
  )
);

-- Update expenses RLS to allow org admins to view/manage
CREATE POLICY "Org admins can view org expenses"
ON public.expenses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    JOIN public.organizations ON organizations.id = profiles.organization_id
    WHERE profiles.id = expenses.user_id
    AND organizations.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Org admins can update org expenses"
ON public.expenses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    JOIN public.organizations ON organizations.id = profiles.organization_id
    WHERE profiles.id = expenses.user_id
    AND organizations.admin_user_id = auth.uid()
  )
);