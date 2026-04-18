import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Database, Server, RefreshCw, ArrowRightLeft, Cloud, HardDrive, CheckCircle2, XCircle, AlertTriangle, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ApiResp<T = any> = { ok: boolean; status?: number; data?: T; error?: string; duration_ms?: number };

async function call<T = any>(action: string, body: Record<string, any> = {}): Promise<ApiResp<T>> {
  try {
    const { data, error } = await supabase.functions.invoke("schema-manager", { body: { action, ...body } });
    if (error) return { ok: false, error: error.message };
    return data as ApiResp<T>;
  } catch (e: any) { return { ok: false, error: e?.message ?? String(e) }; }
}

const DEFAULT_TABLES = [
  "products", "categories", "assets", "asset_files", "customers", "orders", "order_items",
  "purchases", "cart_items", "profiles", "print_orders", "card_templates", "svg_templates",
  "logos", "coupons", "cms_content", "page_customizations", "feature_flags",
  "pricing_rules", "print_pricing_rules", "manual_recommendations", "subscription_plans",
  "subscriptions", "credit_transactions", "api_integrations",
];

export default function DatabaseMigrationManager() {
  const [tab, setTab] = useState("overview");

  // Overview state
  const [overview, setOverview] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [cloudOk, setCloudOk] = useState<boolean | null>(null);
  const [loadingOv, setLoadingOv] = useState(false);

  // Tables state
  const [vpsTables, setVpsTables] = useState<any[]>([]);

  // Migration state
  const [selected, setSelected] = useState<Set<string>>(new Set(["products", "categories", "assets", "asset_files"]));
  const [limit, setLimit] = useState(1000);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<any>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<any[]>([]);

  // Logs state
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [schemaEvents, setSchemaEvents] = useState<any[]>([]);

  const refreshOverview = useCallback(async () => {
    setLoadingOv(true);
    const [ov, hc] = await Promise.all([call("overview"), call("health")]);
    setOverview(ov.ok ? ov.data : null);
    setHealth(hc.ok ? hc.data : null);
    // Cloud check: ping a lightweight Supabase query
    const { error } = await supabase.from("products").select("id", { count: "exact", head: true }).limit(1);
    setCloudOk(!error);
    setLoadingOv(false);
  }, []);

  const refreshTables = useCallback(async () => {
    const r = await call("overview");
    if (r.ok) setVpsTables(r.data?.tables || []);
  }, []);

  const refreshLogs = useCallback(async () => {
    const [a, e, s] = await Promise.all([call("audit-log"), call("schema-events"), call("sync-log")]);
    setAuditLog(a.ok ? (a.data?.rows || []) : []);
    setSchemaEvents(e.ok ? (e.data?.rows || []) : []);
    setSyncLog(s.ok ? (s.data?.rows || []) : []);
  }, []);

  useEffect(() => { refreshOverview(); refreshTables(); refreshLogs(); }, [refreshOverview, refreshTables, refreshLogs]);

  const toggle = (t: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });
  };

  const runMigration = async () => {
    if (selected.size === 0) { toast.error("اختر جدولاً واحداً على الأقل"); return; }
    setMigrating(true);
    setMigrateResult(null);
    const r = await call("cloud-snapshot", { tables: Array.from(selected), limit });
    setMigrateResult(r);
    setMigrating(false);
    if (r.ok) { toast.success("تمت عملية النقل بنجاح"); refreshTables(); refreshLogs(); }
    else if ((r as any).vps_disabled) toast.info("ميزة النقل إلى VPS غير مفعّلة — أضف VPS_BACKUP_URL و VPS_BACKUP_TOKEN");
    else toast.error(r.error || "فشلت عملية النقل");
  };

  const runSyncNow = async () => {
    setSyncing(true);
    const r = await call("cloud-snapshot", { tables: Array.from(selected), limit });
    setSyncing(false);
    if (r.ok) { toast.success("تمت المزامنة"); refreshLogs(); }
    else if ((r as any).vps_disabled) toast.info("ميزة المزامنة إلى VPS غير مفعّلة");
    else toast.error(r.error || "فشلت المزامنة");
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-primary" />
            مدير قاعدة البيانات وعمليات النقل
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            نقل آمن وتدريجي من Lovable Cloud إلى السيرفر الخاص (VPS)
          </p>
        </div>
        <Button onClick={() => { refreshOverview(); refreshTables(); refreshLogs(); }} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 ml-1" /> تحديث الكل
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="tables">الجداول</TabsTrigger>
          <TabsTrigger value="migration">النقل</TabsTrigger>
          <TabsTrigger value="sync">المزامنة</TabsTrigger>
          <TabsTrigger value="logs">السجلات</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ConnCard
              icon={<Cloud className="w-5 h-5" />}
              title="Lovable Cloud (المصدر)"
              status={cloudOk}
              detail={cloudOk === null ? "جاري الفحص..." : cloudOk ? "متصل ويعمل" : "تعذر الاتصال"}
            />
            <ConnCard
              icon={<HardDrive className="w-5 h-5" />}
              title="VPS السيرفر الخاص (الوجهة)"
              status={health?.ok ?? null}
              detail={health?.ok ? `متصل · ${health.time?.slice(11, 19)}` : "تعذر الاتصال — تأكد من VPS_BACKUP_URL"}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="عدد الجداول (VPS)" value={overview?.table_count ?? "—"} icon={<Database />} />
            <Stat label="عدد الصفوف الإجمالي" value={overview?.total_rows?.toLocaleString() ?? "—"} icon={<Server />} />
            <Stat label="حجم قاعدة البيانات" value={overview?.db_size ?? "—"} icon={<HardDrive />} />
            <Stat label="مصدر البيانات الافتراضي" value="Lovable Cloud" icon={<Cloud />} />
          </div>

          {loadingOv && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> جاري التحميل...</div>}
        </TabsContent>

        {/* TABLES */}
        <TabsContent value="tables" className="mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">جداول VPS ({vpsTables.length})</h3>
              <Button onClick={refreshTables} size="sm" variant="ghost"><RefreshCw className="w-4 h-4" /></Button>
            </div>
            <div className="overflow-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="text-right p-2">اسم الجدول</th>
                    <th className="text-right p-2">عدد الصفوف</th>
                    <th className="text-right p-2">الحجم</th>
                  </tr>
                </thead>
                <tbody>
                  {vpsTables.map((t) => (
                    <tr key={t.table_name} className="border-t border-border hover:bg-muted/50">
                      <td className="p-2 font-mono">{t.table_name}</td>
                      <td className="p-2">{Number(t.row_count || 0).toLocaleString()}</td>
                      <td className="p-2 text-muted-foreground">{t.size}</td>
                    </tr>
                  ))}
                  {vpsTables.length === 0 && (
                    <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">لا توجد جداول — قم بإجراء نقل أول من تبويب "النقل"</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* MIGRATION */}
        <TabsContent value="migration" className="space-y-4 mt-4">
          <Card className="p-4">
            <div className="flex items-start gap-3 p-3 mb-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-amber-600 dark:text-amber-400">عملية آمنة وتدريجية</p>
                <p className="text-muted-foreground mt-1">
                  النقل يتم باستخدام <code className="bg-muted px-1 rounded">UPSERT</code> على عمود <code className="bg-muted px-1 rounded">id</code> — لن يتم حذف أي بيانات على VPS، والصفوف الموجودة يتم تحديثها.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">اختر الجداول المراد نقلها</h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set(DEFAULT_TABLES))}>اختيار الكل</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>إلغاء الكل</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-auto p-2 border border-border rounded-lg">
              {DEFAULT_TABLES.map((t) => (
                <label key={t} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer text-sm">
                  <Checkbox checked={selected.has(t)} onCheckedChange={() => toggle(t)} />
                  <span className="font-mono">{t}</span>
                </label>
              ))}
            </div>

            <div className="flex items-end gap-3 mt-4">
              <div className="flex-1">
                <Label className="text-xs">الحد الأقصى للصفوف لكل جدول</Label>
                <Input type="number" min={1} max={5000} value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
              </div>
              <Button onClick={runMigration} disabled={migrating} className="gap-2">
                {migrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                تنفيذ النقل ({selected.size} جدول)
              </Button>
            </div>

            {migrateResult && (
              <div className="mt-4 p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  {migrateResult.ok ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                  <span className="font-semibold text-sm">
                    {migrateResult.ok ? "تم النقل بنجاح" : "فشل النقل"} · {migrateResult.duration_ms}ms
                  </span>
                </div>
                {migrateResult.error && <p className="text-xs text-red-500">{migrateResult.error}</p>}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs mt-2">
                  {(migrateResult.snapshot || []).map((s: any) => (
                    <div key={s.table} className="flex justify-between p-1.5 bg-background rounded">
                      <span className="font-mono">{s.table}</span>
                      <span className={s.error ? "text-red-500" : "text-green-500"}>
                        {s.error ? "✗" : `${s.rows} صف`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* SYNC */}
        <TabsContent value="sync" className="space-y-4 mt-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">المزامنة اليدوية</h3>
            <p className="text-sm text-muted-foreground mb-3">
              تستخدم نفس الجداول المختارة في تبويب "النقل" ({selected.size} جدول). اضغط الزر لإرسال أحدث نسخة إلى VPS.
            </p>
            <Button onClick={runSyncNow} disabled={syncing || selected.size === 0} className="gap-2">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              مزامنة الآن
            </Button>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">سجل المزامنات الأخيرة</h3>
              <Button size="sm" variant="ghost" onClick={refreshLogs}><RefreshCw className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-1 max-h-80 overflow-auto">
              {syncLog.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2 text-xs bg-muted/30 rounded">
                  <span className="font-mono">{new Date(r.created_at).toLocaleString("ar")}</span>
                  <Badge variant={r.status === "success" ? "default" : "destructive"}>{r.status}</Badge>
                  <span>{r.table_count} جدول · {r.row_count} صف</span>
                  <span className="text-muted-foreground">{r.duration_ms}ms</span>
                </div>
              ))}
              {syncLog.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">لا يوجد سجل بعد</p>}
            </div>
          </Card>
        </TabsContent>

        {/* LOGS */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">سجل تدقيق المدير (Audit Log)</h3>
            <div className="space-y-1 max-h-72 overflow-auto text-xs">
              {auditLog.map((r, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 p-2 bg-muted/30 rounded">
                  <span className="col-span-3 font-mono text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")}</span>
                  <span className="col-span-2"><Badge variant={r.success ? "default" : "destructive"}>{r.action}</Badge></span>
                  <span className="col-span-2 font-mono">{r.target}</span>
                  <span className="col-span-2 truncate">{r.actor}</span>
                  <span className="col-span-3 truncate text-muted-foreground">{r.error || "—"}</span>
                </div>
              ))}
              {auditLog.length === 0 && <p className="text-center py-6 text-muted-foreground">لا يوجد سجل</p>}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">أحداث المخطط التلقائية (Schema Events)</h3>
            <div className="space-y-1 max-h-72 overflow-auto text-xs">
              {schemaEvents.map((r, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 p-2 bg-muted/30 rounded">
                  <span className="col-span-3 font-mono text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")}</span>
                  <span className="col-span-2"><Badge>{r.event_type}</Badge></span>
                  <span className="col-span-2 font-mono">{r.table_name}</span>
                  <span className="col-span-2 font-mono">{r.column_name || "—"}</span>
                  <span className="col-span-3 truncate text-muted-foreground">{JSON.stringify(r.details)}</span>
                </div>
              ))}
              {schemaEvents.length === 0 && <p className="text-center py-6 text-muted-foreground">لا يوجد سجل</p>}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: any; icon: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
        <div className="w-4 h-4">{icon}</div>
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}

function ConnCard({ icon, title, status, detail }: { icon: React.ReactNode; title: string; status: boolean | null; detail: string }) {
  const color = status === null ? "text-muted-foreground" : status ? "text-green-500" : "text-red-500";
  const bg = status === null ? "bg-muted/30" : status ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30";
  return (
    <Card className={`p-4 border ${bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">{icon}{title}</div>
        {status === null ? <Loader2 className="w-4 h-4 animate-spin" /> : status ? <CheckCircle2 className={`w-5 h-5 ${color}`} /> : <XCircle className={`w-5 h-5 ${color}`} />}
      </div>
      <p className={`text-sm mt-2 ${color}`}>{detail}</p>
    </Card>
  );
}
