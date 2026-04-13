import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError("تم إنشاء الحساب! يمكنك تسجيل الدخول الآن.");
        setIsSignUp(false);
        setLoading(false);
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      // Check if user has admin role
      const { data: roles } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", data.user.id);

      const isAdmin = (roles as any[])?.some((r: any) => r.role === "admin");

      if (!isAdmin) {
        await supabase.auth.signOut();
        setError("ليس لديك صلاحية الوصول إلى لوحة التحكم");
        setLoading(false);
        return;
      }

      navigate("/admin");
    } catch (err: any) {
      setError(err.message === "Invalid login credentials" ? "بريد إلكتروني أو كلمة مرور خاطئة" : err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">
            HN <span className="text-primary">Book</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">لوحة تحكم المدير</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold text-foreground mb-6 text-center">
            {isSignUp ? "إنشاء حساب جديد" : "تسجيل الدخول"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="pr-9 bg-secondary/30 border-border"
                  required
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-9 bg-secondary/30 border-border"
                  required
                  minLength={6}
                  dir="ltr"
                />
              </div>
            </div>

            {error && (
              <p className={`text-xs text-center px-3 py-2 rounded-lg ${
                error.includes("تم إنشاء") ? "bg-green-400/10 text-green-400" : "bg-destructive/10 text-destructive"
              }`}>
                {error}
              </p>
            )}

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isSignUp ? "إنشاء حساب" : "تسجيل الدخول"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="text-xs text-primary hover:underline"
            >
              {isSignUp ? "لديك حساب؟ سجل الدخول" : "ليس لديك حساب؟ أنشئ واحداً"}
            </button>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-4">
          HN Book © {new Date().getFullYear()} — جزء من HN Groupe
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
