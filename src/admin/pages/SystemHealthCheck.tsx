import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, Play, Loader2, Clock, Wrench,
  CheckCircle, AlertTriangle, XCircle, Heart, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──

type CheckStatus = "idle" | "running" | "pass" | "warn" | "fail";

interface CheckDef {
  id: string;
  nameAr: string;
  icon: string;
  category: string;
  run: () => Promise<{ status: CheckStatus; message: string }>;
}

interface CheckState {
  id: string;
  nameAr: string;
  icon: string;
  category: string;
  status: CheckStatus;
  message: string;
}

interface RepairIssue {
  type: string;
  count: number;
  description: string;
}

interface RepairAction {
  type: string;
  bookId?: string;
  bookName?: string;
  action: string;
  result: "fixed" | "failed" | "skipped";
  detail: string;
}

interface RepairResult {
  mode: string;
  issues: RepairIssue[];
  totalIssues: number;
  actions: RepairAction[];
  summary: { fixed: number; failed: number; skipped: number; total: number } | null;
}

// ── Health Checks ──

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
    id: "db-upload-jobs", nameAr: "مهام الرفع", icon: "📤", category: "data",
    run: async () => {
      const { data, error } = await supabase.from("upload_jobs").select("status");
      if (error) return { status: "fail", message: error.message };
      const failed = (data || []).filter((j: any) => j.status === "error").length;
      const stuck = (data || []).filter((j: any) => j.status === "processing").length;
      if (failed > 0 || stuck > 0) return { status: "warn", message: `${failed} فاشل · ${stuck} عالق` };
      return { status: "pass", message: `${(data || []).length} مهمة` };
    },
  },
  {
    id: "storage-books", nameAr: "تخزين صور الكتب", icon: "🖼️", category: "system",
    run: async () => {
      const { error } = await supabase.storage.from("book-images").list("", { limit: 1 });
      if (error) return { status: "warn", message: "لا يمكن الوصول للتخزين" };
      return { status: "pass", message: "التخزين يعمل" };
    },
  },
  {
    id: "storage-pdfs", nameAr: "تخزين ملفات PDF", icon: "📄", category: "system",
    run: async () => {
      const { error } = await supabase.storage.from("book-files").list("", { limit: 1 });
      if (error) return { status: "warn", message: "لا يمكن الوصول للتخزين" };
      return { status: "pass", message: "التخزين يعمل" };
    },
  },
  {
    id: "pricing-rules", nameAr: "قواعد التسعير", icon: "💰", category: "data",
    run: async () => {
      const { count, error } = await supabase.from("pricing_rules").select("*", { count: "exact", head: true }).eq("is_active", true);
      if (error) return { status: "fail", message: error.message };
      if (!count || count === 0) return { status: "warn", message: "لا توجد قواعد تسعير نشطة" };
      return { status: "pass", message: `${count} قاعدة نشطة` };
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
];

const statusIcon = (s: CheckStatus) => {
  if (s === "pass") return <CheckCircle className="w-5 h-5 text-emerald-500" />;
  if (s === "warn") return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  if (s === "fail") return <XCircle className="w-5 h-5 text-red-500" />;
  if (s === "running") return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
  return <Clock className="w-5 h-5 text-muted-foreground" />;
};

const ISSUE_ICONS: Record<string, string> = {
  no_pdf: "📄",
  no_cover: "🖼️",
  failed_jobs: "❌",
  no_category: "📂",
  zero_price: "💰",
  stuck_jobs: "⏳",
};

// ── Component ──

const SystemHealthCheck = () => {
  const [checks, setChecks] = useState<CheckState[]>(
    healthChecks.map(c => ({ id: c.id, nameAr: c.nameAr, icon: c.icon, category: c.category, status: "idle", message: "في الانتظار" }))
  );
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastScan, setLastScan] = useState<string | null>(null);

  // Repair state
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [repairMode, setRepairMode] = useState<"idle" | "scanning" | "fixing">("idle");

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
    toast.success("✅ اكتمل الفحص");
  };

  const runRepair = async (mode: "scan" | "fix") => {
    setRepairing(true);
    setRepairMode(mode === "scan" ? "scanning" : "fixing");

    try {
      const { data, error } = await supabase.functions.invoke("system-repair", {
        body: { mode },
      });

      if (error) {
        toast.error("فشل: " + error.message);
        return;
      }

      setRepairResult(data as RepairResult);

      if (mode === "scan") {
        const total = (data as RepairResult).totalIssues;
        if (total === 0) toast.success("✅ لا توجد مشاكل!");
        else toast.warning(`⚠️ تم العثور على ${total} مشكلة`);
      } else {
        const s = (data as RepairResult).summary;
        if (s) {
          toast.success(`✅ تم إصلاح ${s.fixed} · فشل ${s.failed} · تخطي ${s.skipped}`);
        }
      }
    } catch (err: any) {
      toast.error("خطأ: " + (err.message || "غير معروف"));
    } finally {
      setRepairing(false);
      setRepairMode("idle");
    }
  };

  const passCount = checks.filter(c => c.status === "pass").length;
  const warnCount = checks.filter(c => c.status === "warn").length;
  const failCount = checks.filter(c => c.status === "fail").length;
  const total = passCount + warnCount + failCount;
  const score = total > 0 ? Math.round((passCount / total) * 100) : 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">فحص صحة النظام</h1>
            <p className="text-sm text-muted-foreground">{healthChecks.length} فحص + إصلاح تلقائي</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {lastScan && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {lastScan}</span>}
          <Badge className="bg-emerald-500/20 text-emerald-500 gap-1"><Heart className="w-3 h-3 animate-pulse" /> نشط</Badge>
          <Button onClick={runAllChecks} disabled={scanning} className="gap-2 rounded-xl" variant="outline">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {scanning ? "جاري الفحص..." : "فحص النظام"}
          </Button>
        </div>
      </div>

      {/* Progress */}
      {scanning && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-center">{progress}%</p>
        </motion.div>
      )}

      {/* Score */}
      {!scanning && total > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card/50 p-5 flex flex-col md:flex-row items-center gap-6">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black border-4 ${
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

      {/* Check cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {checks.map((check, i) => (
          <motion.div key={check.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`rounded-xl border bg-card p-4 flex items-center gap-3 transition-all ${
              check.status === "fail" ? "border-red-500/30" : check.status === "warn" ? "border-yellow-500/30" : "border-border"
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

      {/* ═══════════ Auto-Repair Section ═══════════ */}
      <div className="border-t border-border pt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">🔧 الإصلاح التلقائي</h2>
              <p className="text-xs text-muted-foreground">فحص البيانات وإصلاح المشاكل الشائعة تلقائياً</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => runRepair("scan")}
              disabled={repairing}
              className="gap-1.5 rounded-xl"
            >
              {repairMode === "scanning" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              فحص المشاكل
            </Button>
            <Button
              onClick={() => runRepair("fix")}
              disabled={repairing}
              className="gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black"
            >
              {repairMode === "fixing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
              إصلاح النظام
            </Button>
          </div>
        </div>

        {/* Repair results */}
        {repairResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Issues found */}
            {repairResult.issues.length > 0 ? (
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="text-sm font-bold text-foreground mb-3">
                  ⚠️ المشاكل المكتشفة ({repairResult.totalIssues})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {repairResult.issues.map((issue) => (
                    <div key={issue.type} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border">
                      <span className="text-lg">{ISSUE_ICONS[issue.type] || "⚠️"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{issue.description}</p>
                      </div>
                      <Badge variant="destructive" className="text-[10px] h-5">{issue.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground">✅ النظام سليم — لا توجد مشاكل!</p>
              </div>
            )}

            {/* Fix summary */}
            {repairResult.summary && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="text-sm font-bold text-foreground mb-3">📊 ملخص الإصلاح</h3>
                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                  <div className="rounded-xl bg-emerald-500/10 p-3">
                    <p className="text-2xl font-black text-emerald-500">{repairResult.summary.fixed}</p>
                    <p className="text-[11px] text-muted-foreground">✅ تم إصلاحه</p>
                  </div>
                  <div className="rounded-xl bg-red-500/10 p-3">
                    <p className="text-2xl font-black text-red-500">{repairResult.summary.failed}</p>
                    <p className="text-[11px] text-muted-foreground">❌ فشل</p>
                  </div>
                  <div className="rounded-xl bg-secondary p-3">
                    <p className="text-2xl font-black text-muted-foreground">{repairResult.summary.skipped}</p>
                    <p className="text-[11px] text-muted-foreground">⏭️ تم تخطيه</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action log */}
            {repairResult.actions.length > 0 && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-secondary/30">
                  <h3 className="text-xs font-bold text-foreground">📝 سجل الإجراءات ({repairResult.actions.length})</h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto divide-y divide-border/50">
                  {repairResult.actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-secondary/20 transition-colors">
                      <span className="text-sm mt-0.5">
                        {action.result === "fixed" ? "✅" : action.result === "failed" ? "❌" : "⏭️"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{action.action}</p>
                        {action.bookName && (
                          <p className="text-[11px] text-muted-foreground truncate">{action.bookName}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">{action.detail}</p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground flex-shrink-0">
                        {ISSUE_ICONS[action.type] || "⚙️"} {action.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SystemHealthCheck;
