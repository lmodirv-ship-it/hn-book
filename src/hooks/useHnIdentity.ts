import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const HN_APP_CODE = "hn-book";

export type HnRole = "owner" | "admin" | "manager" | "editor" | "subscriber" | "guest";

export interface HnIdentity {
  loading: boolean;
  role: HnRole;
  email: string | null;
  userId: string | null;
  redirect: string;
  isOwner: boolean;
  isStaff: boolean;
}

/**
 * Central HN identity: registers the signed-in user in hn_users,
 * resolves their role for this app and returns the dashboard route.
 */
export function useHnIdentity(): HnIdentity {
  const [state, setState] = useState<HnIdentity>({
    loading: true,
    role: "guest",
    email: null,
    userId: null,
    redirect: "/auth",
    isOwner: false,
    isStaff: false,
  });

  useEffect(() => {
    let mounted = true;

    const resolve = async (hasSession: boolean) => {
      if (!hasSession) {
        if (mounted)
          setState({
            loading: false,
            role: "guest",
            email: null,
            userId: null,
            redirect: "/auth",
            isOwner: false,
            isStaff: false,
          });
        return;
      }
      const { data, error } = await supabase.rpc("hn_bootstrap_me" as any, {
        _app_code: HN_APP_CODE,
      } as any);
      if (!mounted) return;
      const res = (data ?? {}) as any;
      if (error || !res.ok) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }
      const role = (res.role ?? "subscriber") as HnRole;
      setState({
        loading: false,
        role,
        email: res.email ?? null,
        userId: res.user_id ?? null,
        redirect: res.redirect ?? "/user/dashboard",
        isOwner: role === "owner",
        isStaff: ["owner", "admin", "manager", "editor"].includes(role),
      });
    };

    supabase.auth.getSession().then(({ data: { session } }) => resolve(!!session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      resolve(!!session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
