import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If already logged in as admin → go straight to dashboard
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if ((roles as any[])?.some((r) => r.role === "admin")) navigate("/admin");
    })();
  }, [navigate]);

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/admin/login",
      });
      if (result.error) throw result.error;
      if (result.redirected) return; // browser will redirect

      // Tokens received → check role
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("لم يتم إنشاء الجلسة");

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const isAdmin = (roles as any[])?.some((r) => r.role === "admin");
      if (!isAdmin) {
        await supabase.auth.signOut();
        setError("هذا الحساب ليس مديراً. استخدم الإيميل المعتمد.");
        setLoading(false);
        return;
      }
      navigate("/admin");
    } catch (err: any) {
      setError(err?.message || "تعذّر تسجيل الدخول");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Glow background */}
      <div className="absolute inset-0 -z-10">
        <div className="aurora-bg" />
        <div className="grid-floor" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">
            HN <span className="text-primary">Book</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">لوحة تحكم المدير</p>
        </div>

        <div className="glass-future rounded-2xl p-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">دخول المدير</h2>
          </div>
          <p className="text-xs text-muted-foreground text-center mb-6">
            سجّل الدخول بحساب Google المعتمد فقط
          </p>

          <Button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full gap-3 h-12 bg-white text-[#1f1f1f] hover:bg-white/90 font-semibold rounded-full"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.05-3.72 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
                  <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84Z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.1 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/>
                </svg>
                المتابعة عبر Google
              </>
            )}
          </Button>

          {error && (
            <p className="mt-4 text-xs text-center px-3 py-2 rounded-lg bg-destructive/10 text-destructive">
              {error}
            </p>
          )}

          <p className="text-[11px] text-muted-foreground/80 text-center mt-6 leading-relaxed">
            لا حاجة لكلمة سر — صلاحية المدير تُمنح تلقائياً<br/>
            للحساب المعتمد عند تسجيل الدخول.
          </p>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-4">
          HN Book © {new Date().getFullYear()} — جزء من HN Groupe
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
