-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense_submitted', 'expense_approved', 'expense_rejected', 'join_request', 'join_approved', 'join_rejected')),
  related_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins and managers can create notifications for any user
CREATE POLICY "Admins can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'finance'::app_role) OR
  auth.uid() = user_id
);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function to create notification for expense submission
CREATE OR REPLACE FUNCTION public.notify_expense_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_admin_id UUID;
  v_employee_name TEXT;
BEGIN
  -- Get organization and admin info
  SELECT p.organization_id, o.admin_user_id, p.full_name
  INTO v_org_id, v_admin_id, v_employee_name
  FROM public.profiles p
  JOIN public.organizations o ON o.id = p.organization_id
  WHERE p.id = NEW.user_id;
  
  IF v_admin_id IS NOT NULL THEN
    -- Notify admin
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      v_admin_id,
      'New Expense Submitted',
      v_employee_name || ' submitted an expense of ₹' || NEW.amount,
      'expense_submitted',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for expense submission
CREATE TRIGGER on_expense_submitted
AFTER INSERT ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.notify_expense_submitted();

-- Function to create notification for expense status change
CREATE OR REPLACE FUNCTION public.notify_expense_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
BEGIN
  -- Only notify on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      v_title := 'Expense Approved';
      v_message := 'Your expense of ₹' || NEW.amount || ' has been approved';
      v_type := 'expense_approved';
    ELSIF NEW.status = 'rejected' THEN
      v_title := 'Expense Rejected';
      v_message := 'Your expense of ₹' || NEW.amount || ' has been rejected';
      v_type := 'expense_rejected';
    ELSE
      RETURN NEW;
    END IF;
    
    -- Notify employee
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.user_id,
      v_title,
      v_message,
      v_type,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for expense status change
CREATE TRIGGER on_expense_status_change
AFTER UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.notify_expense_status_change();

-- Function to notify admin of join requests
CREATE OR REPLACE FUNCTION public.notify_join_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_employee_name TEXT;
BEGIN
  -- Get admin and employee info
  SELECT o.admin_user_id, p.full_name
  INTO v_admin_id, v_employee_name
  FROM public.organizations o
  JOIN public.profiles p ON p.id = NEW.employee_id
  WHERE o.id = NEW.org_id;
  
  IF v_admin_id IS NOT NULL THEN
    -- Notify admin
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      v_admin_id,
      'New Join Request',
      v_employee_name || ' requested to join your organization',
      'join_request',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for join request
CREATE TRIGGER on_join_request
AFTER INSERT ON public.join_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_join_request();

-- Function to notify employee of join request status
CREATE OR REPLACE FUNCTION public.notify_join_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
  v_org_name TEXT;
BEGIN
  -- Only notify on status change
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status != 'pending' THEN
    SELECT name INTO v_org_name FROM public.organizations WHERE id = NEW.org_id;
    
    IF NEW.status = 'approved' THEN
      v_title := 'Join Request Approved';
      v_message := 'Your request to join ' || v_org_name || ' has been approved';
      v_type := 'join_approved';
    ELSIF NEW.status = 'rejected' THEN
      v_title := 'Join Request Rejected';
      v_message := 'Your request to join ' || v_org_name || ' has been rejected';
      v_type := 'join_rejected';
    ELSE
      RETURN NEW;
    END IF;
    
    -- Notify employee
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.employee_id,
      v_title,
      v_message,
      v_type,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for join request status change
CREATE TRIGGER on_join_status_change
AFTER UPDATE ON public.join_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_join_status_change();