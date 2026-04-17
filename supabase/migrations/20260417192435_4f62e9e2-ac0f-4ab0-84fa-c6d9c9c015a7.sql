-- 1. Per-user permission overrides
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  effect text NOT NULL DEFAULT 'grant' CHECK (effect IN ('grant','deny')),
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(user_id, permission_key)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage user permissions"
  ON public.user_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON public.user_permissions(user_id);

-- 2. Updated has_permission: deny > grant > role > admin
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_effect text;
BEGIN
  -- Per-user override wins over everything except admin role
  SELECT effect INTO v_effect
  FROM public.user_permissions
  WHERE user_id = _user_id AND permission_key = _permission
  LIMIT 1;

  IF v_effect = 'deny' THEN
    -- Even admins are blocked? No — admin role bypass
    RETURN public.has_role(_user_id, 'admin');
  END IF;

  IF v_effect = 'grant' THEN
    RETURN true;
  END IF;

  -- Fall back to role-based permission, with admin bypass
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id AND rp.permission_key = _permission
  ) OR public.has_role(_user_id, 'admin');
END;
$$;