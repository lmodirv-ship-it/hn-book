import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, Play, Loader2, Clock, Shield, Server, Zap,
  Database as DbIcon, CheckCircle, AlertTriangle, XCircle, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type CheckStatus = "idle" | "running" | "pass" | "warn" | "fail";

interface CheckDef {
  id: string;
  nameAr: string;
  icon: string;
  category: string;
  run: () => Promise<{ status: CheckStatus; message: string }>;
}

const healthChecks: CheckDef[] = [
  {
    id: "auth-session", nameAr: "جلسة المصادقة", icon: "🔐", category: "security",
    run: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session ? { status: "pass", message: "جلسة نشطة" } : { status: "fail", message: "لا توجد جلسة" };
    },
  },
  {
    id: "db-products", nameAr: "جدول المنتجات", icon: "📦", category: "data",
    run: async () => {
      const { count, error } = await supabase.from("products").select("*", { count: "exact", head: true });
      if (error) return { status: "fail", message: error.message };
      return { status: "pass", message: `${count} منتج` };
    },
  },
  {
    id: "db-orders", nameAr: "جدول الطلبات", icon: "🛒", category: "data",
    run: async () => {
      const { count, error } = await supabase.from("orders").select("*", { count: "exact", head: true });
      if (error) return { status: "fail", message: error.message };
      return { status: "pass", message: `${count} طلب` };
    },
  },
  {
    id: "db-customers", nameAr: "جدول العملاء", icon: "👥", category: "data",
    run: async () => {
      const { count, error } = await supabase.from("customers").select("*", { count: "exact", head: true });
      if (error) return { status: "fail", message: error.message };
      return { status: "pass", message: `${count} عميل` };
    },
  },
  {
    id: "db-coupons", nameAr: "جدول الكوبونات", icon: "🎟️", category: "data",
    run: async () => {
      const { count, error } = await supabase.from("coupons").select("*", { count: "exact", head: true });
      if (error) return { status: "fail", message: error.message };
      return { status: "pass", message: `${count} كوبون` };
    },
  },
  {
    id: "storage-books", nameAr: "تخزين صور الكتب", icon: "🖼️", category: "system",
    run: async () => {
      const { data, error } = await supabase.storage.from("book-images").list("", { limit: 1 });
      if (error) return { status: "warn", message: "لا يمكن الوصول للتخزين" };
      return { status: "pass", message: "التخزين يعمل" };
    },
  },
  {
    id: "storage-avatars", nameAr: "تخزين الصور الشخصية", icon: "👤", category: "system",
    run: async () => {
      const { data, error } = await supabase.storage.from("avatars").list("", { limit: 1 });
      if (error) return { status: "warn", message: "لا يمكن الوصول للتخزين" };
      return { status: "pass", message: "التخزين يعمل" };
    },
  },
  {
    id: "perf-memory", nameAr: "استهلاك الذاكرة", icon: "🧠", category: "performance",
    run: async () => {
      const mem = (performance as any).memory;
      if (!mem) return { status: "pass", message: "غير متاح في هذا المتصفح" };
      const pct = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;
      if (pct > 80) return { status: "fail", message: `استهلاك عالي: ${pct.toFixed(0)}%` };
      if (pct > 50) return { status: "warn", message: `${pct.toFixed(0)}% مستخدم` };
      return { status: "pass", message: `${pct.toFixed(0)}% مستخدم` };
    },
  },
  {
    id: "perf-localstorage", nameAr: "التخزين المحلي", icon: "💾", category: "performance",
    run: async () => {
      try {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) total += (localStorage.getItem(key) || "").length;
        }
        const mb = (total / 1024 / 1024).toFixed(2);
        return total > 4 * 1024 * 1024
          ? { status: "warn", message: `${mb} MB مستخدم — يفضل التنظيف` }
          : { status: "pass", message: `${mb} MB مستخدم` };
      } catch {
        return { status: "warn", message: "لا يمكن قراءة التخزين المحلي" };
      }
    },
  },
];

interface CheckState { id: string; nameAr: string; icon: string; category: string; status: CheckStatus; message: string; }

const statusIcon = (s: CheckStatus) => {
  if (s === "pass") return <CheckCircle className="w-5 h-5 text-emerald-500" />;
  if (s === "warn") return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  if (s === "fail") return <XCircle className="w-5 h-5 text-red-500" />;
  if (s === "running") return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
  return <Clock className="w-5 h-5 text-muted-foreground" />;
};

const SystemHealthCheck = () => {
  const [checks, setChecks] = useState<CheckState[]>(
    healthChecks.map(c => ({ id: c.id, nameAr: c.nameAr, icon: c.icon, category: c.category, status: "idle", message: "في الانتظار" }))
  );
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const updateCheck = useCallback((id: string, update: Partial<CheckState>) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...update } : c));
  }, []);

  const runAllChecks = async () => {
    setScanning(true);
    setProgress(0);
    setChecks(prev => prev.map(c => ({ ...c, status: "running" as CheckStatus, message: "جاري الفحص..." })));

    for (let i = 0; i < healthChecks.length; i++) {
      const def = healthChecks[i];
      try {
        const result = await def.run();
        updateCheck(def.id, result);
      } catch (e: any) {
        updateCheck(def.id, { status: "fail", message: e.message || "خطأ غير متوقع" });
      }
      setProgress(Math.round(((i + 1) / healthChecks.length) * 100));
    }
    setScanning(false);
    setLastScan(new Date().toLocaleString("ar-MA"));
    toast({ title: "✅ اكتمل الفحص" });
  };

  const passCount = checks.filter(c => c.status === "pass").length;
  const warnCount = checks.filter(c => c.status === "warn").length;
  const failCount = checks.filter(c => c.status === "fail").length;
  const total = passCount + warnCount + failCount;
  const score = total > 0 ? Math.round((passCount / total) * 100) : 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">فحص صحة النظام</h1>
            <p className="text-sm text-muted-foreground">{healthChecks.length} فحص شامل</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastScan && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {lastScan}</span>}
          <Badge className="bg-emerald-500/20 text-emerald-500 gap-1"><Heart className="w-3 h-3 animate-pulse" /> نشط</Badge>
          <Button onClick={runAllChecks} disabled={scanning} className="gap-2 rounded-xl">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {scanning ? "جاري الفحص..." : "بدء الفحص"}
          </Button>
        </div>
      </div>

      {scanning && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-center">{progress}%</p>
        </motion.div>
      )}

      {!scanning && total > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6">
          <div className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl font-black border-4 ${
            score >= 80 ? "border-emerald-500 text-emerald-500" : score >= 50 ? "border-yellow-500 text-yellow-500" : "border-red-500 text-red-500"
          }`}>{score}%</div>
          <div className="flex-1 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-emerald-500"><CheckCircle className="w-5 h-5" /><span className="text-2xl font-bold">{passCount}</span></div>
              <p className="text-xs text-muted-foreground">ناجح</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-yellow-500"><AlertTriangle className="w-5 h-5" /><span className="text-2xl font-bold">{warnCount}</span></div>
              <p className="text-xs text-muted-foreground">تحذير</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-red-500"><XCircle className="w-5 h-5" /><span className="text-2xl font-bold">{failCount}</span></div>
              <p className="text-xs text-muted-foreground">فشل</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {checks.map((check, i) => (
          <motion.div key={check.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`glass-card rounded-xl p-4 flex items-center gap-3 transition-all ${
              check.status === "fail" ? "border-red-500/30" : check.status === "warn" ? "border-yellow-500/30" : ""
            }`}>
            <span className="text-2xl">{check.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{check.nameAr}</p>
              <p className="text-xs text-muted-foreground truncate">{check.message}</p>
            </div>
            {statusIcon(check.status)}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SystemHealthCheck;
