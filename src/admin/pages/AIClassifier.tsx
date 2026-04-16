import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Brain, RefreshCw, CheckCircle2, XCircle, BarChart3,
  TrendingUp, Database, Loader2, Edit3, Save, AlertTriangle,
  Activity, Wifi, WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { aiService, type AIEngineStatus } from "@/services/aiService";

interface ModelStats {
  type: string;
  samples: number;
  accuracy: number;
  correctPredictions: number;
  avgWidth: number;
  avgHeight: number;
  avgRatio: number;
  commonKeywords: string[];
  avgFileSizeKB: number;
}

interface StatsResponse {
  totalSamples: number;
  totalCorrections: number;
  overallAccuracy: number;
  modelCount: number;
  models: ModelStats[];
}

interface ClassificationRecord {
  id: string;
  file_name: string;
  predicted_type: string;
  actual_type: string | null;
  confidence: number;
  was_corrected: boolean;
  width: number | null;
  height: number | null;
  created_at: string;
  dimensions?: string;
}

const DESIGN_TYPES = [
  "card", "logo", "tablou", "poster", "flyer",
  "menu", "book", "document", "social", "banner", "sticker", "other",
];

const TYPE_LABELS: Record<string, string> = {
  card: "بطاقة", logo: "شعار", tablou: "تابلو", poster: "ملصق",
  flyer: "فلاير", menu: "قائمة", book: "كتاب", document: "مستند",
  social: "منشور", banner: "بانر", sticker: "ملصق صغير", other: "أخرى",
};

const AIClassifier = () => {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [records, setRecords] = useState<ClassificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [tab, setTab] = useState<"engine" | "overview" | "corrections">("engine");
  const [engineStatus, setEngineStatus] = useState<AIEngineStatus | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("ml-classifier", {
        body: { action: "stats" },
      });
      if (!error && data) setStats(data as StatsResponse);
    } catch (e) {
      console.error("Stats fetch error:", e);
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    const { data } = await supabase
      .from("classification_data")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setRecords(data as unknown as ClassificationRecord[]);
  }, []);

  const checkHealth = useCallback(async () => {
    setCheckingHealth(true);
    try {
      const status = await aiService.checkAIHealth();
      setEngineStatus(status);
    } finally {
      setCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchStats(), fetchRecords(), checkHealth()]).finally(() => setLoading(false));
  }, [fetchStats, fetchRecords, checkHealth]);

  const handleTrain = async () => {
    setTraining(true);
    try {
      const { data, error } = await supabase.functions.invoke("ml-classifier", {
        body: { action: "train" },
      });
      if (error) throw new Error(error.message);
      toast.success(`تم تدريب النموذج — ${(data as any)?.totalSamples || 0} عينة`);
      await fetchStats();
    } catch (e: any) {
      toast.error("فشل التدريب: " + e.message);
    } finally {
      setTraining(false);
    }
  };

  const handleCorrection = async (id: string, actualType: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke("ml-classifier", {
        body: {
          action: "correct",
          classification_id: id,
          actual_type: actualType,
          corrected_by: session?.session?.user?.id,
        },
      });
      if (error) throw new Error(error.message);
      toast.success("تم حفظ التصحيح");
      setEditingId(null);
      await fetchRecords();
    } catch (e: any) {
      toast.error("فشل التصحيح: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">محرك الذكاء الاصطناعي</h1>
            <p className="text-sm text-muted-foreground">نظام تصنيف ذكي يتعلم من التصحيحات</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchRecords(); }}>
            <RefreshCw className="w-4 h-4 ml-1" /> تحديث
          </Button>
          <Button size="sm" onClick={handleTrain} disabled={training}>
            {training ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Brain className="w-4 h-4 ml-1" />}
            {training ? "جاري التدريب..." : "إعادة التدريب"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Database} label="عينات التدريب" value={stats.totalSamples} />
          <StatCard icon={TrendingUp} label="دقة النموذج" value={`${stats.overallAccuracy}%`} color={stats.overallAccuracy >= 70 ? "text-green-400" : stats.overallAccuracy >= 40 ? "text-yellow-400" : "text-red-400"} />
          <StatCard icon={BarChart3} label="أنواع مدربة" value={stats.modelCount} />
          <StatCard icon={Edit3} label="تصحيحات" value={stats.totalCorrections} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${tab === "engine" ? "bg-primary/10 text-primary font-semibold border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("engine")}
        >
          <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> محرك AI</span>
        </button>
        <button
          className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${tab === "overview" ? "bg-primary/10 text-primary font-semibold border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("overview")}
        >
          نظرة عامة على النموذج
        </button>
        <button
          className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${tab === "corrections" ? "bg-primary/10 text-primary font-semibold border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("corrections")}
        >
          التصنيفات والتصحيحات ({records.length})
        </button>
      </div>

      {/* Tab: AI Engine Status */}
      {tab === "engine" && (
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                حالة محرك الذكاء الاصطناعي
              </h2>
              <Button variant="outline" size="sm" onClick={checkHealth} disabled={checkingHealth}>
                {checkingHealth ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="mr-1">فحص</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-background border border-border">
                {engineStatus?.running ? (
                  <Wifi className="w-8 h-8 text-green-500" />
                ) : (
                  <WifiOff className="w-8 h-8 text-red-500" />
                )}
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <p className="text-lg font-bold">
                    {engineStatus?.running ? (
                      <Badge variant="default" className="bg-green-600">يعمل ✓</Badge>
                    ) : (
                      <Badge variant="destructive">متوقف ✗</Badge>
                    )}
                  </p>
                </div>
              </div>

              {/* Accuracy */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-background border border-border">
                <TrendingUp className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">دقة النموذج</p>
                  <p className="text-lg font-bold">{engineStatus?.overallAccuracy ?? 0}%</p>
                </div>
              </div>

              {/* Total Samples */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-background border border-border">
                <Database className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">عينات التدريب</p>
                  <p className="text-lg font-bold">{engineStatus?.totalSamples ?? 0}</p>
                </div>
              </div>

              {/* Model Count */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-background border border-border">
                <Brain className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">أنواع مدربة</p>
                  <p className="text-lg font-bold">{engineStatus?.modelCount ?? 0}</p>
                </div>
              </div>
            </div>

            {!engineStatus?.running && (
              <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-yellow-500">المحرك غير متاح</p>
                  <p className="text-muted-foreground">النظام يستخدم التصنيف المحلي (rule-based) كبديل تلقائي. جميع عمليات الرفع تعمل بشكل طبيعي.</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Quick Test */}
          <QuickTestPanel />
        </div>
      )}

      {/* Tab: Overview */}
      {tab === "overview" && stats && (
        <div className="space-y-4">
          {stats.models.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">لا يوجد نموذج مدرب بعد</p>
              <p className="text-sm">ارفع ملفات عبر "الاستيراد الذكي" ثم اضغط "إعادة التدريب"</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {stats.models.map((m) => (
                <motion.div
                  key={m.type}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-sm font-mono">{m.type}</Badge>
                      <span className="text-sm text-muted-foreground">{TYPE_LABELS[m.type] || m.type}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{m.samples} عينة</span>
                      <span className={m.accuracy >= 70 ? "text-green-400 font-semibold" : m.accuracy >= 40 ? "text-yellow-400" : "text-red-400"}>
                        {m.accuracy}% دقة
                      </span>
                    </div>
                  </div>
                  <Progress value={m.accuracy} className="h-2 mb-2" />
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span>متوسط: {m.avgWidth}×{m.avgHeight}px</span>
                    <span>·</span>
                    <span>نسبة: {m.avgRatio.toFixed(2)}</span>
                    <span>·</span>
                    <span>حجم: {m.avgFileSizeKB > 1024 ? `${(m.avgFileSizeKB / 1024).toFixed(1)}MB` : `${m.avgFileSizeKB}KB`}</span>
                    {m.commonKeywords.length > 0 && (
                      <>
                        <span>·</span>
                        <span>كلمات: {m.commonKeywords.slice(0, 5).join(", ")}</span>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Corrections */}
      {tab === "corrections" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>لا توجد تصنيفات بعد</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {records.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.file_name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span>تنبؤ: <strong className="text-foreground">{TYPE_LABELS[r.predicted_type] || r.predicted_type}</strong></span>
                      <span>·</span>
                      <span className={Number(r.confidence) >= 0.7 ? "text-green-400" : Number(r.confidence) >= 0.4 ? "text-yellow-400" : "text-red-400"}>
                        ثقة: {(Number(r.confidence) * 100).toFixed(0)}%
                      </span>
                      {r.width && r.height && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{r.width}×{r.height}</span>
                        </>
                      )}
                      {r.was_corrected && (
                        <Badge variant="secondary" className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                          مصحح
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actual type / correction */}
                  <div className="flex items-center gap-2">
                    {editingId === r.id ? (
                      <>
                        <Select value={editValue} onValueChange={setEditValue}>
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DESIGN_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {TYPE_LABELS[t] || t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleCorrection(r.id, editValue)}>
                          <Save className="w-4 h-4 text-green-400" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}>
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {r.actual_type ? (
                          <Badge variant="outline" className="text-xs">
                            {r.actual_type === r.predicted_type ? (
                              <CheckCircle2 className="w-3 h-3 ml-1 text-green-400" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 ml-1 text-yellow-400" />
                            )}
                            {TYPE_LABELS[r.actual_type] || r.actual_type}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">
                            غير مؤكد
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => { setEditingId(r.id); setEditValue(r.actual_type || r.predicted_type); }}
                        >
                          <Edit3 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}

function QuickTestPanel() {
  const [filename, setFilename] = useState("carte-visite.jpg");
  const [width, setWidth] = useState("1050");
  const [height, setHeight] = useState("600");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await aiService.classifyFile({
        filename,
        width: Number(width) || null,
        height: Number(height) || null,
        file_type: filename.split(".").pop() || null,
      });
      setResult(res);
    } catch (e) {
      toast.error("فشل الاختبار");
    } finally {
      setTesting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <h3 className="text-md font-bold mb-4 flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary" />
        اختبار سريع
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <input
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="اسم الملف"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
        />
        <input
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="العرض"
          type="number"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
        />
        <input
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="الارتفاع"
          type="number"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
        />
      </div>
      <Button size="sm" onClick={handleTest} disabled={testing}>
        {testing ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Brain className="w-4 h-4 ml-1" />}
        تصنيف
      </Button>

      {result && (
        <div className="mt-4 p-4 rounded-lg bg-background border border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">النوع:</span>
              <p className="font-bold text-primary">{result.type}</p>
            </div>
            <div>
              <span className="text-muted-foreground">الثقة:</span>
              <p className="font-bold">{(result.confidence * 100).toFixed(0)}%</p>
            </div>
            <div>
              <span className="text-muted-foreground">المصدر:</span>
              <Badge variant={result.source === "ml" ? "default" : "secondary"}>
                {result.source === "ml" ? "ML Model" : result.source === "rules" ? "Rules" : "Fallback"}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">النسبة:</span>
              <p className="font-mono">{result.ratio ?? "—"}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default AIClassifier;
