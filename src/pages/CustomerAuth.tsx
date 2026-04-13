import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setMessage(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setMessage({ text: "حدث خطأ أثناء تسجيل الدخول بـ Google", type: "error" });
      }
      if (result.redirected) return;
      navigate("/profile");
    } catch {
      setMessage({ text: "حدث خطأ أثناء تسجيل الدخول بـ Google", type: "error" });
    }
    setGoogleLoading(false);
  };

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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground">أو</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2 h-11 text-sm font-medium border-border"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            الدخول بحساب Google
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-6">
          HN Book © {new Date().getFullYear()} — جزء من HN Groupe
        </p>
      </motion.div>
    </div>
  );
};

export default CustomerAuth;
