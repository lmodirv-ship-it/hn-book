import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Lock, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    // Check for recovery session from URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setValidSession(true);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setValidSession(true);
        else navigate("/auth");
      });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/auth"), 3000);
    }
    setLoading(false);
  };

  if (!validSession) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">إعادة تعيين كلمة المرور</h1>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
              <p className="text-sm text-foreground font-medium">تم تغيير كلمة المرور بنجاح!</p>
              <p className="text-xs text-muted-foreground">سيتم توجيهك لتسجيل الدخول...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">كلمة المرور الجديدة</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" className="pr-9 bg-secondary/30 border-border" required minLength={6} dir="ltr" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">تأكيد كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••" className="pr-9 bg-secondary/30 border-border" required minLength={6} dir="ltr" />
                </div>
              </div>

              {error && <p className="text-xs text-center px-3 py-2 rounded-lg bg-destructive/10 text-destructive">{error}</p>}

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تحديث كلمة المرور"}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
