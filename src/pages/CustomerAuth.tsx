import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Mail, Lock, User, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const CustomerAuth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/profile");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name },
          },
        });
        if (error) throw error;
        setMessage({ text: "تم إنشاء حسابك بنجاح! يمكنك تسجيل الدخول الآن.", type: "success" });
        setIsLogin(true);
        setPassword("");
      }
    } catch (err: any) {
      const msg =
        err.message === "Invalid login credentials"
          ? "بريد إلكتروني أو كلمة مرور خاطئة"
          : err.message === "User already registered"
          ? "هذا البريد مسجل بالفعل، سجل الدخول"
          : err.message;
      setMessage({ text: msg, type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative" dir="rtl">
      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 right-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        العودة للرئيسية
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground font-['Space_Grotesk']">
            HN <span className="text-primary">Book</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? "مرحباً بعودتك!" : "أنشئ حسابك واستمتع بأفضل المنتجات الرقمية"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-secondary/50">
            <button
              onClick={() => { setIsLogin(true); setMessage(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                isLogin ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => { setIsLogin(false); setMessage(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                !isLogin ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              حساب جديد
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (signup only) */}
            {!isLogin && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <label className="text-xs text-muted-foreground mb-1.5 block">الاسم الكامل</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="أدخل اسمك"
                    className="pr-9 bg-secondary/30 border-border"
                    required={!isLogin}
                  />
                </div>
              </motion.div>
            )}

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

            {message && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-xs text-center px-3 py-2.5 rounded-lg ${
                  message.type === "success"
                    ? "bg-green-400/10 text-green-400 border border-green-400/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
              >
                {message.text}
              </motion.p>
            )}

            <Button type="submit" className="w-full gap-2 h-11 text-sm font-semibold" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? "تسجيل الدخول" : "إنشاء حساب"}
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-6">
          HN Book © {new Date().getFullYear()} — جزء من HN Groupe
        </p>
      </motion.div>
    </div>
  );
};

export default CustomerAuth;
