-- Allow anyone to view organization names for joining
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;

CREATE POLICY "Anyone can view org names for joining"
ON public.organizations
FOR SELECT
USING (true);