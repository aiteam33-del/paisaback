-- Grant admin role automatically when an organization is created
CREATE OR REPLACE FUNCTION public.grant_admin_on_org_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Give 'admin' role to the org creator (admin_user_id)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.admin_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_admin_on_org_create ON public.organizations;
CREATE TRIGGER grant_admin_on_org_create
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_on_org_create();