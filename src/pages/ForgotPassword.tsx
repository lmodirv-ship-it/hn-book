import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Mail, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">استعادة كلمة المرور</h1>
          <p className="text-sm text-muted-foreground mt-1">أدخل بريدك الإلكتروني لإرسال رابط الاستعادة</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-400/10 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-sm text-foreground font-medium">تم إرسال رابط الاستعادة إلى بريدك الإلكتروني</p>
              <p className="text-xs text-muted-foreground">تحقق من بريدك الوارد واتبع الرابط لإعادة تعيين كلمة المرور</p>
              <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
                العودة لتسجيل الدخول
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="pr-9 bg-secondary/30 border-border"
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-center px-3 py-2 rounded-lg bg-destructive/10 text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>إرسال رابط الاستعادة</>}
              </Button>

              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="w-full text-xs text-primary hover:underline flex items-center justify-center gap-1"
              >
                <ArrowRight className="w-3 h-3" />
                العودة لتسجيل الدخول
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
