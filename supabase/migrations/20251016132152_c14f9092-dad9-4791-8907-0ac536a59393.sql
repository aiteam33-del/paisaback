-- Create join_requests table
CREATE TABLE public.join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT unique_pending_request UNIQUE (employee_id, org_id, status)
);

-- Enable RLS
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Employees can view their own requests"
  ON public.join_requests FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Employees can create requests"
  ON public.join_requests FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Org admins can view org requests"
  ON public.join_requests FOR SELECT
  USING (is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org admins can update org requests"
  ON public.join_requests FOR UPDATE
  USING (is_org_admin(auth.uid(), org_id));

-- Trigger for updated_at
CREATE TRIGGER update_join_requests_updated_at
  BEFORE UPDATE ON public.join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Helper function to approve request
CREATE OR REPLACE FUNCTION public.approve_join_request(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id UUID;
  v_org_id UUID;
BEGIN
  -- Get request details
  SELECT employee_id, org_id INTO v_employee_id, v_org_id
  FROM public.join_requests
  WHERE id = request_id AND status = 'pending';
  
  IF v_employee_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update request status
  UPDATE public.join_requests
  SET status = 'approved', updated_at = now()
  WHERE id = request_id;
  
  -- Link employee to organization
  UPDATE public.profiles
  SET organization_id = v_org_id, updated_at = now()
  WHERE id = v_employee_id;
  
  RETURN TRUE;
END;
$$;

-- Helper function to reject request
CREATE OR REPLACE FUNCTION public.reject_join_request(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.join_requests
  SET status = 'rejected', updated_at = now()
  WHERE id = request_id AND status = 'pending';
  
  RETURN FOUND;
END;
$$;