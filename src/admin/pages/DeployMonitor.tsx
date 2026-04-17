/**
 * /admin/deploy — Deploy monitor page.
 * Shows recent build/upload/deploy phase logs from integration_logs
 * (provider='deploy_webhook'), latest persisted status from system_config,
 * and a manual "Retry Deploy" button.
 */
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Rocket, RefreshCw, CheckCircle2, XCircle, Loader2, Send, Clock, Hash, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type LogRow = {
  id: string;
  action: string;
  success: boolean;
  status_code: number | null;
  duration_ms: number | null;
  message: string | null;
  metadata: any;
  created_at: string;
};

const phaseLabel = (action: string) => {
  if (action.endsWith("_build")) return { label: "Build", icon: Hash, color: "text-blue-500" };
  if (action.endsWith("_upload")) return { label: "Upload", icon: Send, color: "text-amber-500" };
  if (action.endsWith("_deploy")) return { label: "Deploy", icon: Rocket, color: "text-primary" };
  return { label: action, icon: Zap, color: "text-muted-foreground" };
};

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("ar-EG", { hour12: false });
};

const DeployMonitor = () => {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [lastStatus, setLastStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: logRows }, { data: cfg }] = await Promise.all([
      supabase
        .from("integration_logs")
        .select("id,action,success,status_code,duration_ms,message,metadata,created_at")
        .eq("provider", "deploy_webhook")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("system_config")
        .select("value")
        .eq("key", "deploy_last_status")
        .maybeSingle(),
    ]);
    setLogs((logRows as LogRow[]) ?? []);
    setLastStatus(typeof cfg?.value === "string" ? cfg.value : "");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const retryNow = async () => {
    setRetrying(true);
    const tid = toast.loading("جارٍ إعادة المحاولة...");
    const { data, error } = await supabase.functions.invoke("trigger-deploy", {
      body: { trigger: "manual", build_hash: "manual-retry", notes: "manual retry from monitor" },
    });
    toast.dismiss(tid);
    setRetrying(false);
    if (error) {
      toast.error(`فشل: ${error.message}`);
    } else if (data?.success) {
      toast.success(`✓ نجح — ${data.attempts} محاولة، ${data.duration_ms}ms`);
    } else {
      toast.error(`✗ ${data?.message ?? "فشل غير معروف"}`);
    }
    load();
  };

  // Group logs by deploy run (same minute window + same build_hash)
  const grouped: Record<string, LogRow[]> = {};
  for (const l of logs) {
    const hash = l.metadata?.build_hash ?? "?";
    const minute = l.created_at.slice(0, 16);
    const key = `${minute}__${hash}`;
    (grouped[key] ??= []).push(l);
  }
  const runs = Object.entries(grouped).sort((a, b) =>
    b[1][0].created_at.localeCompare(a[1][0].created_at),
  );

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-3 flex-wrap"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            <Rocket className="w-6 h-6 text-primary" /> مراقبة النشر
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            سجل مراحل البناء والرفع والنشر مع إعادة محاولة يدوية.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ml-1 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
          <Button size="sm" onClick={retryNow} disabled={retrying}>
            {retrying ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Send className="w-4 h-4 ml-1" />}
            إعادة محاولة الآن
          </Button>
        </div>
      </motion.div>

      {lastStatus && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            {lastStatus.startsWith("✓")
              ? <CheckCircle2 className="w-4 h-4 text-primary" />
              : <XCircle className="w-4 h-4 text-destructive" />}
            آخر نتيجة محفوظة
          </div>
          <p className="font-mono text-xs break-all text-foreground">{lastStatus}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> تحميل السجلات...
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <Rocket className="w-10 h-10 mx-auto mb-3 opacity-40" />
          لا توجد سجلات نشر بعد.
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map(([key, items]) => {
            const final = items.find((i) => i.action.endsWith("_deploy")) ?? items[0];
            const hash = items[0].metadata?.build_hash ?? "?";
            const trigger = items[0].action.split("_")[0];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    {final.success
                      ? <Badge className="bg-primary/15 text-primary border-primary/30">✓ نجح</Badge>
                      : <Badge className="bg-destructive/15 text-destructive border-destructive/30">✗ فشل</Badge>}
                    <Badge variant="outline" className="text-[10px]">
                      {trigger === "auto" ? "تلقائي" : "يدوي"}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {fmtTime(items[items.length - 1].created_at)}
                    </span>
                  </div>
                  {final.duration_ms != null && (
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {final.duration_ms}ms · {final.metadata?.attempts ?? 1} محاولة
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-muted-foreground font-mono truncate" title={hash}>
                  <Hash className="w-3 h-3 inline ml-1" />{hash}
                </div>

                <div className="space-y-1.5">
                  {items
                    .slice()
                    .sort((a, b) => a.created_at.localeCompare(b.created_at))
                    .map((l) => {
                      const p = phaseLabel(l.action);
                      return (
                        <div
                          key={l.id}
                          className="flex items-start gap-2 text-xs rounded-lg border border-border/50 bg-secondary/20 p-2"
                        >
                          <p.icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${p.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{p.label}</span>
                              {l.status_code != null && (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {l.status_code}
                                </span>
                              )}
                              {l.success
                                ? <CheckCircle2 className="w-3 h-3 text-primary" />
                                : <XCircle className="w-3 h-3 text-destructive" />}
                            </div>
                            {l.message && (
                              <p className="text-muted-foreground mt-0.5 break-all">{l.message}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeployMonitor;
