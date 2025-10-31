-- Update the trigger function to include manager notes in notifications
CREATE OR REPLACE FUNCTION public.notify_expense_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      IF NEW.manager_notes IS NOT NULL AND NEW.manager_notes != '' THEN
        v_message := v_message || '. Note: ' || NEW.manager_notes;
      END IF;
      v_type := 'expense_approved';
    ELSIF NEW.status = 'rejected' THEN
      v_title := 'Expense Rejected';
      v_message := 'Your expense of ₹' || NEW.amount || ' has been rejected';
      IF NEW.manager_notes IS NOT NULL AND NEW.manager_notes != '' THEN
        v_message := v_message || '. Reason: ' || NEW.manager_notes;
      END IF;
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
$function$;