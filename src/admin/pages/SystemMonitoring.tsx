import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity, Database, Brain, ShoppingCart, Users, Server,
  RefreshCw, Loader2, CheckCircle2, AlertTriangle, XCircle,
  TrendingUp, Package, Printer, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface SystemMetric {
  label: string;
  value: number | string;
  icon: any;
  status: "ok" | "warn" | "error";
}

const SystemMonitoring = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});

  const fetchMetrics = useCallback(async () => {
    setLoading(true);

    const [
      productsRes, ordersRes, customersRes, printOrdersRes,
      tablouRes, classificationRes, logsRes, flagsRes,
    ] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("print_orders").select("id", { count: "exact", head: true }),
      supabase.from("tablous").select("id", { count: "exact", head: true }),
      supabase.from("classification_data").select("id", { count: "exact", head: true }),
      supabase.from("system_logs").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("feature_flags").select("key, enabled"),
    ]);

    const counts: Record<string, number> = {
      products: productsRes.count ?? 0,
      orders: ordersRes.count ?? 0,
      customers: customersRes.count ?? 0,
      print_orders: printOrdersRes.count ?? 0,
      tablous: tablouRes.count ?? 0,
      classifications: classificationRes.count ?? 0,
    };
    setTableCounts(counts);

    const enabledFlags = (flagsRes.data ?? []).filter((f: any) => f.enabled).length;
    const totalFlags = (flagsRes.data ?? []).length;

    const m: SystemMetric[] = [
      { label: "المنتجات", value: counts.products, icon: Package, status: counts.products > 0 ? "ok" : "warn" },
      { label: "الطلبات", value: counts.orders, icon: ShoppingCart, status: "ok" },
      { label: "العملاء", value: counts.customers, icon: Users, status: "ok" },
      { label: "طلبات الطباعة", value: counts.print_orders, icon: Printer, status: "ok" },
      { label: "التابلوهات", value: counts.tablous, icon: FileText, status: "ok" },
      { label: "تصنيفات AI", value: counts.classifications, icon: Brain, status: "ok" },
      { label: "الميزات المفعّلة", value: `${enabledFlags}/${totalFlags}`, icon: Activity, status: enabledFlags > 0 ? "ok" : "warn" },
    ];
    setMetrics(m);
    setRecentLogs(logsRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  // AI health check
  const [aiStatus, setAiStatus] = useState<"checking" | "ok" | "down">("checking");
  useEffect(() => {
    supabase.functions.invoke("ml-classifier", { body: { action: "stats" } })
      .then(({ error }) => setAiStatus(error ? "down" : "ok"))
      .catch(() => setAiStatus("down"));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const statusIcon = (s: string) => {
    if (s === "ok") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (s === "warn") return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">مراقبة النظام</h1>
            <p className="text-sm text-muted-foreground">لوحة شاملة لصحة وأداء المنصة</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMetrics}>
          <RefreshCw className="w-4 h-4 ml-1" /> تحديث
        </Button>
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <ServiceCard label="قاعدة البيانات" status="ok" icon={Database} detail="متصل" />
        <ServiceCard label="محرك AI" status={aiStatus === "checking" ? "warn" : aiStatus} icon={Brain} detail={aiStatus === "ok" ? "يعمل" : aiStatus === "checking" ? "جاري الفحص" : "متوقف"} />
        <ServiceCard label="التخزين" status="ok" icon={Server} detail="3 حاويات" />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <m.icon className="w-4 h-4 text-muted-foreground" />
              {statusIcon(m.status)}
            </div>
            <p className="text-2xl font-bold">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Data Distribution */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> توزيع البيانات
        </h3>
        <div className="space-y-3">
          {Object.entries(tableCounts).map(([table, count]) => {
            const max = Math.max(...Object.values(tableCounts), 1);
            return (
              <div key={table} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24 text-left font-mono">{table}</span>
                <Progress value={(count / max) * 100} className="flex-1 h-2" />
                <span className="text-xs font-bold w-10 text-left">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Logs */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-bold mb-4">سجل النظام الأخير</h3>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">لا توجد سجلات</p>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log: any) => (
              <div key={log.id} className="flex items-center gap-3 text-sm border-b border-border pb-2">
                <Badge variant={log.errors_count > 0 ? "destructive" : "default"} className="text-[10px]">
                  {log.action_type}
                </Badge>
                <span className="text-muted-foreground flex-1">
                  إصلاحات: {log.fixes_count} · أخطاء: {log.errors_count}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleDateString("ar")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function ServiceCard({ label, status, icon: Icon, detail }: { label: string; status: string; icon: any; detail: string }) {
  const color = status === "ok" ? "border-green-500/30 bg-green-500/5" : status === "warn" ? "border-yellow-500/30 bg-yellow-500/5" : "border-red-500/30 bg-red-500/5";
  const dot = status === "ok" ? "bg-green-500" : status === "warn" ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`w-2 h-2 rounded-full ${dot} animate-pulse`} />
            <span className="text-xs text-muted-foreground">{detail}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemMonitoring;
