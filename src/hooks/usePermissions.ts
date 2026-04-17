import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { permissionsService } from "@/services/permissionsService";

interface UsePermissionsResult {
  permissions: Set<string>;
  loading: boolean;
  has: (key: string) => boolean;
  isAdmin: boolean;
}

export function usePermissions(): UsePermissionsResult {
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async (userId: string | null) => {
      if (!userId) {
        if (mounted) {
          setPermissions(new Set());
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const admin = (roles ?? []).some((r: any) => r.role === "admin");
      const perms = await permissionsService.getMyPermissions(userId);
      if (!mounted) return;
      setIsAdmin(admin);
      setPermissions(perms);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => load(session?.user.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      load(session?.user.id ?? null);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    permissions,
    loading,
    isAdmin,
    has: (key: string) => isAdmin || permissions.has(key),
  };
}
