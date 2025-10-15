-- Fix UPDATE policy for expenses to ensure org admins can approve/reject
DROP POLICY IF EXISTS "Org admins can update org expenses" ON public.expenses;

CREATE POLICY "Org admins can update org expenses"
ON public.expenses
FOR UPDATE
USING (
  is_org_admin(auth.uid(), (SELECT organization_id FROM public.profiles WHERE id = expenses.user_id))
)
WITH CHECK (
  is_org_admin(auth.uid(), (SELECT organization_id FROM public.profiles WHERE id = expenses.user_id))
);
