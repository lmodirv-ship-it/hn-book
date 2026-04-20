CREATE OR REPLACE FUNCTION public.auto_grant_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'lmodirv@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_grant_admin_on_user_create ON auth.users;
CREATE TRIGGER auto_grant_admin_on_user_create
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_grant_admin_role();

DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'lmodirv@gmail.com' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;