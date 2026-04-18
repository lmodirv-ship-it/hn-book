import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Database, Server, Play, RefreshCw, Loader2, CheckCircle2,
  XCircle, History, Wand2, FileText, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface SchemaResp {
  tables: Record<string, Array<{ column: string; type: string; nullable: boolean; default: string | null }>>;
  counts: Array<{ table_name: string; row_count: number }>;
  table_count: number;
}

const SchemaManager = () => {
  const [health, setHealth] = useState<"ok" | "down" | "loading">("loading");
  const [schema, setSchema] = useState<SchemaResp | null>(null);
  const [syncLog, setSyncLog] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string>("");

  const callVps = useCallback(async (action: string) => {
    const { data, error } = await supabase.functions.invoke("schema-manager", { body: { action } });
    if (error) throw new Error(error.message);
    if (!data?.ok) throw new Error(data?.error || `VPS returned ${data?.status}`);
    return data.data;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const h = await callVps("health").catch(() => null);
      setHealth(h?.ok ? "ok" : "down");
      if (h?.ok) {
        const [s, sl, ev] = await Promise.all([
          callVps("schema").catch(() => null),
          callVps("sync-log").catch(() => ({ rows: [] })),
          callVps("schema-events").catch(() => ({ rows: [] })),
        ]);
        if (s) setSchema(s);
        setSyncLog(sl?.rows ?? []);
        setEvents(ev?.rows ?? []);
      }
    } catch (e: any) {
      toast.error(e.message);
      setHealth("down");
    }
    setLoading(false);
  }, [callVps]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleMigrate = async () => {
    if (!confirm("تشغيل migrations على VPS؟ (إضافي فقط — لن يحذف شيئاً)")) return;
    setMigrating(true);
    setMigrateResult("");
    try {
      const result = await callVps("migrate");
      const applied = (result?.results ?? []).filter((r: any) => r.applied);
      toast.success(`تم تطبيق ${applied.length} migration جديد`);
      setMigrateResult(`✓ ${applied.length} جديد • ${(result?.results?.length ?? 0) - applied.length} مطبّق سابقاً`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
      setMigrateResult(`✗ ${e.message}`);
    }
    setMigrating(false);
  };

  const totalRows = schema?.counts.reduce((s, c) => s + Number(c.row_count || 0), 0) ?? 0;

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Wand2 className="w-6 h-6 text-primary" /> مدير المخطط الذكي (VPS)
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              نظام قواعد بيانات يطوّر نفسه — جداول وأعمدة تُنشأ تلقائياً
            </p>
          </div>
          <div className="flex items-center gap-2">
            {health === "ok" && <Badge className="bg-green-500/10 text-green-500 gap-1"><CheckCircle2 className="w-3 h-3" /> VPS متصل</Badge>}
            {health === "down" && <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> VPS غير متصل</Badge>}
            {health === "loading" && <Badge variant="outline" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" /> جاري الفحص</Badge>}
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Action bar */}
      <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Server className="w-5 h-5 text-primary" />
          <div>
            <div className="text-sm font-bold">{schema?.table_count ?? 0} جدول • {totalRows.toLocaleString()} سجل</div>
            <div className="text-xs text-muted-foreground">آخر مزامنة: {syncLog[0]?.created_at ? new Date(syncLog[0].created_at).toLocaleString("ar") : "—"}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleMigrate} disabled={migrating || health !== "ok"} className="gap-1.5">
            {migrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            تشغيل Migrations
          </Button>
        </div>
      </div>

      {migrateResult && (
        <div className="text-xs bg-secondary/40 rounded-lg px-3 py-2 font-mono">{migrateResult}</div>
      )}

      {health === "down" && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-destructive mb-1">لا يمكن الاتصال بـ VPS</p>
            <p className="text-muted-foreground">
              تأكد من ضبط <code className="bg-secondary px-1.5 py-0.5 rounded">VPS_BACKUP_URL</code> و
              <code className="bg-secondary px-1.5 py-0.5 rounded mx-1">VPS_BACKUP_TOKEN</code>
              في الإعدادات. شاهد <code className="bg-secondary px-1.5 py-0.5 rounded">vps/README.md</code> للإعداد.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="schema">
        <TabsList>
          <TabsTrigger value="schema"><Database className="w-3.5 h-3.5 ml-1" /> المخطط</TabsTrigger>
          <TabsTrigger value="sync"><History className="w-3.5 h-3.5 ml-1" /> سجل المزامنة</TabsTrigger>
          <TabsTrigger value="events"><FileText className="w-3.5 h-3.5 ml-1" /> أحداث المخطط</TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="space-y-3 mt-4">
          {loading && !schema ? (
            <Skeleton className="h-64" />
          ) : !schema ? (
            <div className="text-center text-sm text-muted-foreground py-8">لا توجد بيانات</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {Object.entries(schema.tables).map(([name, cols]) => {
                const count = schema.counts.find(c => c.table_name === name)?.row_count ?? 0;
                return (
                  <div key={name} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-bold">{name}</span>
                      <Badge variant="outline" className="text-xs">{Number(count).toLocaleString()} صف</Badge>
                    </div>
                    <div className="text-xs space-y-0.5 max-h-40 overflow-y-auto">
                      {cols.map(c => (
                        <div key={c.column} className="flex justify-between font-mono text-muted-foreground">
                          <span className="text-foreground/80">{c.column}</span>
                          <span className="text-primary/70">{c.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sync" className="mt-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/30 text-xs">
                <tr>
                  <th className="text-right p-2">التاريخ</th>
                  <th className="text-right p-2">جداول</th>
                  <th className="text-right p-2">صفوف</th>
                  <th className="text-right p-2">المدة</th>
                  <th className="text-right p-2">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {syncLog.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-6 text-muted-foreground text-xs">لا توجد عمليات بعد</td></tr>
                ) : syncLog.map((r) => (
                  <tr key={r.id} className="border-t border-border/40 text-xs">
                    <td className="p-2">{new Date(r.created_at).toLocaleString("ar")}</td>
                    <td className="p-2 font-mono">{r.table_count}</td>
                    <td className="p-2 font-mono">{Number(r.row_count).toLocaleString()}</td>
                    <td className="p-2 font-mono">{r.duration_ms}ms</td>
                    <td className="p-2">
                      {r.status === "success"
                        ? <Badge className="bg-green-500/10 text-green-500 text-[10px]">نجح</Badge>
                        : <Badge variant="destructive" className="text-[10px]">فشل</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <div className="rounded-xl border border-border bg-card divide-y divide-border/40 max-h-[500px] overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs">لا توجد أحداث</div>
            ) : events.map((e) => (
              <div key={e.id} className="p-3 text-xs flex items-start gap-2">
                <Badge variant="outline" className="text-[10px] mt-0.5 shrink-0">{e.event_type}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-foreground/80">
                    {e.table_name}{e.column_name ? `.${e.column_name}` : ""}
                  </div>
                  <div className="text-muted-foreground text-[10px]">{new Date(e.created_at).toLocaleString("ar")}</div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SchemaManager;
