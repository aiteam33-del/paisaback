-- Remove overloaded single-arg function to fix RPC ambiguity and failures
DROP FUNCTION IF EXISTS public.reject_join_request(request_id uuid);

-- Ensure the two-arg version exists and is callable by authenticated users
CREATE OR REPLACE FUNCTION public.reject_join_request(request_id uuid, reason text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.join_requests
  SET 
    status = 'rejected', 
    updated_at = now(),
    rejection_reason = reason,
    rejected_by = auth.uid(),
    rejected_at = now()
  WHERE id = request_id AND status = 'pending';
  
  RETURN FOUND;
END;
$function$;

-- Make sure authenticated users can execute these functions
GRANT EXECUTE ON FUNCTION public.reject_join_request(request_id uuid, reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_join_request(request_id uuid) TO authenticated;