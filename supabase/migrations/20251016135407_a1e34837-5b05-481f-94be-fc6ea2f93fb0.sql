-- Fix policy to let org admins view applicant profiles
DROP POLICY IF EXISTS "Org admins can view applicant profiles" ON public.profiles;
CREATE POLICY "Org admins can view applicant profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.join_requests jr
    JOIN public.organizations o ON o.id = jr.org_id
    WHERE jr.employee_id = profiles.id
      AND jr.status = 'pending'
      AND o.admin_user_id = auth.uid()
  )
  OR (auth.uid() = id)
  OR public.has_role(auth.uid(), 'admin')
);

-- Enable realtime for profiles
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;