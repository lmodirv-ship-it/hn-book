import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface RequireAdminProps {
  children: React.ReactNode;
}

const RequireAdmin = ({ children }: RequireAdminProps) => {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async (userId: string) => {
      const { data: roles } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", userId);

      const isAdmin = (roles as any[])?.some((r: any) => r.role === "admin");

      if (!mounted) return;

      if (!isAdmin) {
        await supabase.auth.signOut();
        navigate("/admin/login", { replace: true });
        return;
      }

      setAuthorized(true);
      setLoading(false);
    };

    // Set up listener BEFORE getSession to avoid race conditions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        if (mounted) {
          setAuthorized(false);
          setLoading(false);
          navigate("/admin/login", { replace: true });
        }
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        checkAdmin(session.user.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading && !authorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
};

export default RequireAdmin;
