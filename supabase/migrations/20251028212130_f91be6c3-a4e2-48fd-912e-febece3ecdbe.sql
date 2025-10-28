-- Create integration_exports table to track export history
CREATE TABLE IF NOT EXISTS public.integration_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  export_type TEXT NOT NULL CHECK (export_type IN ('tally', 'quickbooks', 'zoho', 'calendar')),
  file_name TEXT NOT NULL,
  export_date TIMESTAMPTZ DEFAULT now(),
  expense_count INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integration_exports ENABLE ROW LEVEL SECURITY;

-- Org admins can view their org's export history
CREATE POLICY "Org admins can view export history"
ON public.integration_exports
FOR SELECT
USING (
  public.is_org_admin(auth.uid(), organization_id)
);

-- Org admins can create exports
CREATE POLICY "Org admins can create exports"
ON public.integration_exports
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  public.is_org_admin(auth.uid(), organization_id)
);

-- Create index for faster queries
CREATE INDEX idx_integration_exports_org_id ON public.integration_exports(organization_id);
CREATE INDEX idx_integration_exports_date ON public.integration_exports(export_date DESC);

-- Add slack_webhook_url to organizations table for Slack integration
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS slack_enabled BOOLEAN DEFAULT false;