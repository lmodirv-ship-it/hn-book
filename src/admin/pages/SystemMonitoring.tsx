import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Activity, Database, Server, RefreshCw, Loader2, CheckCircle2, AlertTriangle, XCircle,
  Cpu, HardDrive, FileText, Zap, Trash2, RotateCw, PlayCircle, Wifi, Bell, Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FailoverCard } from "@/admin/components/FailoverCard";

type Status = "ok" | "warn" | "down" | "checking";
interface ServiceState { status: Status; latency_ms?: number; [k: string]: any }
interface HealthData {
  services: {
    api: ServiceState; database: ServiceState; storage: ServiceState;
    workers: ServiceState; pdf_generator: ServiceState; integrations: ServiceState;
  };
  queue: { pending: number; processing: number; done: number; error: number };
}

const SystemMonitoring = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [jobsHealth, setJobsHealth] = useState({ pending: 0, processing: 0, failed: 0, completed: 0, retrying: 0, exhausted: 0, dead: 0 });
  const pollRef = useRef<number | null>(null);

  const fetchHealth = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("system-control", { body: { action: "health" } });
    if (error) { toast.error("فشل فحص النظام: " + error.message); return; }
    setHealth(data);
    setLoading(false);
  }, []);

  const fetchAlerts = useCallback(async () => {
    const { data } = await supabase
      .from("system_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setAlerts(data ?? []);
  }, []);

  const fetchMetrics = useCallback(async () => {
    const { data } = await supabase.functions.invoke("system-control", { body: { action: "metrics" } });
    if (data?.samples) setMetrics(data.samples);
  }, []);

  const fetchJobsHealth = useCallback(async () => {
    const { data } = await supabase.from("jobs").select("status, attempts, max_attempts");
    const rows = data ?? [];
    const failed = rows.filter((r: any) => r.status === "failed");
    setJobsHealth({
      pending: rows.filter((r: any) => r.status === "pending" && (r.attempts ?? 0) === 0).length,
      processing: rows.filter((r: any) => r.status === "processing").length,
      failed: failed.length,
      completed: rows.filter((r: any) => r.status === "completed").length,
      retrying: rows.filter((r: any) => r.status === "pending" && (r.attempts ?? 0) > 0).length,
      exhausted: failed.filter((r: any) => (r.attempts ?? 0) >= (r.max_attempts ?? 3)).length,
      dead: rows.filter((r: any) => r.status === "dead").length,
    });
  }, []);

  useEffect(() => {
    fetchHealth(); fetchAlerts(); fetchMetrics(); fetchJobsHealth();
    pollRef.current = window.setInterval(() => { fetchHealth(); fetchMetrics(); fetchJobsHealth(); }, 15000);

    const channel = supabase
      .channel("system_alerts_stream")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "system_alerts" }, (payload) => {
        setAlerts((prev) => [payload.new, ...prev].slice(0, 20));
        const a = payload.new as any;
        if (a.level === "error") toast.error(`⚠ ${a.message}`);
        else if (a.level === "warning") toast.warning(a.message);
      })
      .subscribe();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchHealth, fetchAlerts, fetchMetrics]);

  const runAction = async (action: string, label: string) => {
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke("system-control", { body: { action } });
      if (error) throw error;
      toast.success(`✓ ${label}`, { description: JSON.stringify(data).slice(0, 120) });
      await Promise.all([fetchHealth(), fetchAlerts()]);
    } catch (err: any) {
      toast.error(`فشل: ${label}`, { description: err.message });
    } finally {
      setBusy(null);
    }
  };

  const ackAlert = async (id: string) => {
    await supabase.functions.invoke("system-control", { body: { action: "ack_alert", id } });
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  };

  if (loading || !health) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const actions = [
    { key: "restart_workers", label: "إعادة تشغيل العمال", icon: RotateCw },
    { key: "clear_cache", label: "مسح الذاكرة", icon: Trash2 },
    { key: "retry_failed", label: "إعادة المحاولة", icon: RefreshCw },
    { key: "reprocess_imports", label: "إعادة معالجة الاستيراد", icon: PlayCircle },
    { key: "regenerate_pdfs", label: "إعادة توليد PDF", icon: FileText },
    { key: "reconnect_apis", label: "إعادة ربط APIs", icon: Wifi },
    { key: "clean_temp", label: "تنظيف المؤقت", icon: Wrench },
  ];

  // Compact metric series
  const lastSample = (key: string) => {
    const s = metrics.filter((m) => m.metric_key === key);
    return s.length ? Number(s[s.length - 1].metric_value) : null;
  };
  const dbLat = lastSample("db_latency_ms");
  const stLat = lastSample("storage_latency_ms");

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">مركز التحكم بالنظام</h1>
            <p className="text-sm text-muted-foreground">صحة المنصة، العمال، الطوابير، والإجراءات الذاتية</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchHealth(); fetchAlerts(); fetchMetrics(); }}>
          <RefreshCw className="w-4 h-4 ml-1" /> تحديث
        </Button>
      </div>

      {/* Failover control (admin-only via RequireAdmin on the route) */}
      <FailoverCard />

      {/* Service health grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <ServiceCard label="API" status={health.services.api.status} icon={Zap} detail={`${health.services.api.latency_ms ?? "-"}ms`} />
        <ServiceCard label="قاعدة البيانات" status={health.services.database.status} icon={Database} detail={`${dbLat ?? health.services.database.latency_ms ?? "-"}ms`} />
        <ServiceCard label="التخزين" status={health.services.storage.status} icon={HardDrive} detail={`${health.services.storage.buckets ?? 0} حاويات`} />
        <ServiceCard label="العمال" status={health.services.workers.status} icon={Cpu} detail={health.services.workers.stuck_jobs > 0 ? `${health.services.workers.stuck_jobs} عالقة` : "نشطة"} />
        <ServiceCard label="مولد PDF" status={health.services.pdf_generator.status} icon={FileText} detail={`${health.services.pdf_generator.products_with_pdf ?? 0} ملف`} />
        <ServiceCard label="التكاملات" status={health.services.integrations.status} icon={Wifi} detail={`${(health.services.integrations.total ?? 0) - (health.services.integrations.down ?? 0)}/${health.services.integrations.total ?? 0}`} />
      </div>

      {/* Performance strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricBox label="زمن استجابة API" value={`${health.services.api.latency_ms ?? 0}ms`} />
        <MetricBox label="زمن DB" value={`${dbLat ?? 0}ms`} />
        <MetricBox label="زمن التخزين" value={`${stLat ?? 0}ms`} />
        <MetricBox label="عينات المقاييس" value={metrics.length} />
      </div>

      {/* Actions */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" /> الإجراءات الذاتية
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {actions.map((a) => (
            <Button
              key={a.key}
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => runAction(a.key, a.label)}
              className="h-11 justify-start gap-2"
            >
              {busy === a.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <a.icon className="w-4 h-4" />}
              <span className="text-xs">{a.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Queue */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" /> طابور المهام
          </h3>
          <Button size="sm" variant="default" disabled={busy !== null || (health.queue.error ?? 0) === 0}
            onClick={() => runAction("retry_failed", "إعادة المحاولة")}>
            <RefreshCw className="w-3 h-3 ml-1" /> إعادة الفاشلة ({health.queue.error})
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <QueueBox label="قيد الانتظار" value={health.queue.pending} color="bg-yellow-500/10 text-yellow-600 border-yellow-500/30" />
          <QueueBox label="قيد المعالجة" value={health.queue.processing} color="bg-blue-500/10 text-blue-600 border-blue-500/30" />
          <QueueBox label="فاشلة" value={health.queue.error} color="bg-red-500/10 text-red-600 border-red-500/30" />
          <QueueBox label="مكتملة" value={health.queue.done} color="bg-green-500/10 text-green-600 border-green-500/30" />
        </div>
      </div>

      {/* Self-Healing Queue Health */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" /> صحة طابور الإصلاح الذاتي
          </h3>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">حد المحاولات: حسب النوع</Badge>
            {jobsHealth.dead > 0 && (
              <Badge variant="destructive" className="text-xs">{jobsHealth.dead} dead — تدخل يدوي</Badge>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          <QueueBox label="بانتظار" value={jobsHealth.pending} color="bg-yellow-500/10 text-yellow-600 border-yellow-500/30" />
          <QueueBox label="معالجة" value={jobsHealth.processing} color="bg-blue-500/10 text-blue-600 border-blue-500/30" />
          <QueueBox label="إعادة محاولة" value={jobsHealth.retrying} color="bg-purple-500/10 text-purple-600 border-purple-500/30" />
          <QueueBox label="فاشلة" value={jobsHealth.failed} color="bg-red-500/10 text-red-600 border-red-500/30" />
          <QueueBox label="استُنفدت" value={jobsHealth.exhausted} color="bg-orange-500/10 text-orange-600 border-orange-500/30" />
          <QueueBox label="ميتة" value={jobsHealth.dead} color="bg-foreground/10 text-foreground border-foreground/40" />
          <QueueBox label="مكتملة" value={jobsHealth.completed} color="bg-green-500/10 text-green-600 border-green-500/30" />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          المهام الفاشلة تُعاد تلقائياً حتى 3 محاولات. العمال العالقون أكثر من 10 دقائق يُعاد تشغيلهم تلقائياً عبر محرك الإصلاح الذاتي كل دقيقتين.
        </p>
      </div>

      {/* Alerts */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> التنبيهات الفورية
        </h3>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">لا توجد تنبيهات نشطة</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {alerts.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  a.level === "error" ? "border-red-500/30 bg-red-500/5"
                  : a.level === "warning" ? "border-yellow-500/30 bg-yellow-500/5"
                  : "border-border bg-muted/30"
                } ${a.acknowledged ? "opacity-50" : ""}`}
              >
                {a.level === "error" ? <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  : a.level === "warning" ? <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                  : <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.message}</p>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] ml-1">{a.source}</Badge>
                    {new Date(a.created_at).toLocaleTimeString("ar")}
                  </p>
                </div>
                {!a.acknowledged && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => ackAlert(a.id)}>تأكيد</Button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function ServiceCard({ label, status, icon: Icon, detail }: { label: string; status: Status; icon: any; detail: string }) {
  const color = status === "ok" ? "border-green-500/30 bg-green-500/5"
    : status === "warn" ? "border-yellow-500/30 bg-yellow-500/5"
    : status === "down" ? "border-red-500/30 bg-red-500/5"
    : "border-border bg-muted/20";
  const dot = status === "ok" ? "bg-green-500" : status === "warn" ? "bg-yellow-500" : status === "down" ? "bg-red-500" : "bg-muted";
  return (
    <div className={`rounded-xl border p-3 ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${dot} ${status === "ok" ? "animate-pulse" : ""}`} />
        <span className="text-xs text-muted-foreground">{detail}</span>
      </div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}

function QueueBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-lg border p-3 text-center ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[11px] mt-1">{label}</p>
    </div>
  );
}

export default SystemMonitoring;
