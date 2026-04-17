import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Wrench, Power, PlayCircle, CheckCircle2, XCircle, Clock, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Rule {
  id: string;
  key: string;
  label: string;
  description: string;
  trigger_metric: string;
  threshold: number;
  action: string;
  enabled: boolean;
  cooldown_seconds: number;
  last_triggered_at: string | null;
}
interface Run {
  id: string;
  rule_key: string;
  metric: string;
  metric_value: number;
  threshold: number;
  action: string;
  triggered: boolean;
  success: boolean;
  message: string;
  created_at: string;
}

const AutoHealCenter = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [rulesRes, runsRes] = await Promise.all([
      supabase.functions.invoke("auto-heal", { body: { action: "list_rules" } }),
      supabase.functions.invoke("auto-heal", { body: { action: "recent_runs" } }),
    ]);
    if (rulesRes.data) {
      setRules(rulesRes.data.rules ?? []);
      setGlobalEnabled(rulesRes.data.enabled !== false);
    }
    if (runsRes.data) setRuns(runsRes.data.runs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("auto_heal_runs_stream")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auto_heal_runs" }, (payload) => {
        setRuns((prev) => [payload.new as Run, ...prev].slice(0, 50));
        const r = payload.new as Run;
        if (r.triggered) {
          if (r.success) toast.success(`✓ Auto-healed: ${r.rule_key}`);
          else toast.error(`✗ Auto-fix failed: ${r.rule_key}`);
        }
      })
      .subscribe();
    const t = window.setInterval(load, 30_000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [load]);

  const setGlobal = async (v: boolean) => {
    setGlobalEnabled(v);
    await supabase.functions.invoke("auto-heal", { body: { action: "set_global", enabled: v } });
    toast.success(v ? "Auto-Healing مُفعَّل" : "Auto-Healing مُعطَّل");
  };

  const toggleRule = async (id: string, enabled: boolean) => {
    setRules((p) => p.map((r) => (r.id === id ? { ...r, enabled } : r)));
    await supabase.functions.invoke("auto-heal", { body: { action: "toggle_rule", id, enabled } });
  };

  const updateRule = async (id: string, patch: Partial<Rule>) => {
    setRules((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    await supabase.functions.invoke("auto-heal", { body: { action: "update_rule", id, ...patch } });
  };

  const runNow = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("auto-heal", { body: { action: "evaluate" } });
    setBusy(false);
    if (error) toast.error("فشل التشغيل: " + error.message);
    else {
      const triggered = (data?.results ?? []).filter((r: any) => r.triggered).length;
      toast.success(`تم الفحص — ${triggered} إجراء تلقائي`);
      load();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-border rounded-2xl p-5 bg-card">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center">
            <Wrench className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">مركز الإصلاح التلقائي</h1>
            <p className="text-sm text-muted-foreground">يراقب النظام ويُصلح المشاكل تلقائياً</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={runNow} disabled={busy} variant="outline">
            {busy ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : <PlayCircle className="h-4 w-4 ms-2" />}
            تشغيل فوري
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted">
            <Power className={`h-4 w-4 ${globalEnabled ? "text-emerald-500" : "text-muted-foreground"}`} />
            <span className="text-sm font-medium">Auto-Heal</span>
            <Switch checked={globalEnabled} onCheckedChange={setGlobal} />
          </div>
        </div>
      </motion.div>

      {!globalEnabled && (
        <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div>
            <p className="font-medium">الإصلاح التلقائي معطّل</p>
            <p className="text-sm text-muted-foreground">المراقبة لا تزال تعمل لكن لن تُنفّذ أي إجراءات.</p>
          </div>
        </div>
      )}

      {/* Rules */}
      <div className="border border-border rounded-2xl bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">قواعد الإصلاح</h2>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
        <div className="divide-y divide-border">
          {rules.map((r) => (
            <div key={r.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{r.label}</h3>
                  <Badge variant="outline" className="text-xs">{r.trigger_metric}</Badge>
                  <Badge variant="secondary" className="text-xs">→ {r.action}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.description}</p>
                {r.last_triggered_at && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> آخر تشغيل: {new Date(r.last_triggered_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-end gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">الحد</label>
                  <Input type="number" value={r.threshold} className="w-24"
                    onChange={(e) => setRules((p) => p.map((x) => x.id === r.id ? { ...x, threshold: Number(e.target.value) } : x))}
                    onBlur={(e) => updateRule(r.id, { threshold: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">تهدئة (ث)</label>
                  <Input type="number" value={r.cooldown_seconds} className="w-24"
                    onChange={(e) => setRules((p) => p.map((x) => x.id === r.id ? { ...x, cooldown_seconds: Number(e.target.value) } : x))}
                    onBlur={(e) => updateRule(r.id, { cooldown_seconds: Number(e.target.value) })} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">مفعّل</span>
                  <Switch checked={r.enabled} onCheckedChange={(v) => toggleRule(r.id, v)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent runs */}
      <div className="border border-border rounded-2xl bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold">سجل العمليات الأخيرة</h2>
        </div>
        <div className="max-h-[420px] overflow-auto divide-y divide-border">
          {runs.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">لا يوجد سجل بعد</p>}
          {runs.map((r) => (
            <div key={r.id} className="p-4 flex items-center gap-3 text-sm">
              {r.triggered ? (
                r.success
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  : <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              ) : <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.rule_key}</span>
                  <Badge variant="outline" className="text-xs">{r.metric} = {r.metric_value}</Badge>
                  <span className="text-xs text-muted-foreground">≥ {r.threshold}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{r.message}</p>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AutoHealCenter;
