import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Database, Server, Play, RefreshCw, Loader2, CheckCircle2, XCircle,
  History, Wand2, FileText, AlertTriangle, Search, Plus, Trash2, Pencil,
  ShieldAlert, Terminal, Columns, FileSearch,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────
type Column = { column: string; type: string; nullable: boolean; default: string | null };
type Schema = {
  tables: Record<string, Column[]>;
  counts: Array<{ table_name: string; row_count: number }>;
  table_count: number;
};
type Overview = {
  db_size: string; db_bytes: number; table_count: number; total_rows: number;
  tables: Array<{ table_name: string; row_count: number; size: string; size_bytes: number }>;
};

const PG_TYPES = [
  "TEXT","INTEGER","BIGINT","NUMERIC","BOOLEAN","UUID","JSONB","TIMESTAMPTZ","DATE",
];

const inferColumnsFromRow = (row: Record<string, unknown>): Column[] =>
  Object.keys(row).map((k) => ({
    column: k,
    type: typeof row[k] === "number" ? "numeric"
      : typeof row[k] === "boolean" ? "boolean"
      : Array.isArray(row[k]) || (row[k] && typeof row[k] === "object") ? "jsonb"
      : "text",
    nullable: true,
    default: null,
  }));

const formatCell = (v: any): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

// ── Component ─────────────────────────────────────────────
const DatabaseManager = () => {
  const [tab, setTab] = useState("overview");
  const [health, setHealth] = useState<"ok" | "down" | "loading">("loading");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [schema, setSchema] = useState<Schema | null>(null);
  const [loading, setLoading] = useState(false);

  const callVps = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("schema-manager", {
      body: { action, ...payload },
    });
    if (error) throw new Error(error.message);
    if (!data?.ok) throw new Error(data?.data?.error || data?.error || `VPS returned ${data?.status}`);
    return data.data;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const h = await callVps("health").catch(() => null);
      setHealth(h?.ok ? "ok" : "down");
      if (h?.ok) {
        const [ov, sc] = await Promise.all([
          callVps("overview").catch(() => null),
          callVps("schema").catch(() => null),
        ]);
        if (ov) setOverview(ov);
        if (sc) setSchema(sc);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  }, [callVps]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            مدير قاعدة البيانات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            تحكم كامل في قاعدة البيانات على VPS — استكشاف، تعديل، استعلامات، ترحيلات
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionBadge state={health} />
          <Button onClick={refresh} disabled={loading} variant="outline" size="sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="mx-2">تحديث</span>
          </Button>
        </div>
      </div>

      {health === "down" && (
        <Card className="p-4 border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-destructive">VPS غير متصل</p>
              <p className="text-muted-foreground mt-1">
                تأكد من ضبط <code className="bg-muted px-1 rounded">VPS_BACKUP_URL</code> و
                <code className="bg-muted px-1 rounded mx-1">VPS_BACKUP_TOKEN</code> وأن الخادم يعمل.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab} dir="rtl">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview"><Server className="w-4 h-4 ml-1" />نظرة عامة</TabsTrigger>
          <TabsTrigger value="tables"><Columns className="w-4 h-4 ml-1" />الجداول</TabsTrigger>
          <TabsTrigger value="data"><FileSearch className="w-4 h-4 ml-1" />البيانات</TabsTrigger>
          <TabsTrigger value="query"><Terminal className="w-4 h-4 ml-1" />الاستعلام</TabsTrigger>
          <TabsTrigger value="migrations"><History className="w-4 h-4 ml-1" />الترحيلات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab overview={overview} loading={loading} />
        </TabsContent>
        <TabsContent value="tables" className="mt-4">
          <TablesTab schema={schema} callVps={callVps} onRefresh={refresh} />
        </TabsContent>
        <TabsContent value="data" className="mt-4">
          <DataTab schema={schema} callVps={callVps} />
        </TabsContent>
        <TabsContent value="query" className="mt-4">
          <QueryTab callVps={callVps} />
        </TabsContent>
        <TabsContent value="migrations" className="mt-4">
          <MigrationsTab callVps={callVps} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ConnectionBadge = ({ state }: { state: "ok" | "down" | "loading" }) => {
  if (state === "loading") return <Badge variant="outline"><Loader2 className="w-3 h-3 animate-spin ml-1" />فحص...</Badge>;
  if (state === "ok") return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 ml-1" />متصل</Badge>;
  return <Badge variant="destructive"><XCircle className="w-3 h-3 ml-1" />غير متصل</Badge>;
};

const OverviewTab = ({ overview, loading }: { overview: Overview | null; loading: boolean }) => {
  if (loading && !overview) return <Skeleton className="h-64 w-full" />;
  if (!overview) return <p className="text-muted-foreground">لا توجد بيانات.</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="حجم القاعدة" value={overview.db_size} icon={Database} />
        <Stat label="عدد الجداول" value={String(overview.table_count)} icon={Columns} />
        <Stat label="إجمالي الصفوف" value={overview.total_rows.toLocaleString("ar")} icon={FileText} />
        <Stat label="الحالة" value="نشط" icon={CheckCircle2} accent />
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b font-semibold">تفاصيل الجداول</div>
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr className="text-right">
                <th className="p-3">الجدول</th>
                <th className="p-3">عدد الصفوف</th>
                <th className="p-3">الحجم</th>
              </tr>
            </thead>
            <tbody>
              {overview.tables.map((t) => (
                <tr key={t.table_name} className="border-t hover:bg-muted/50">
                  <td className="p-3 font-mono">{t.table_name}</td>
                  <td className="p-3">{Number(t.row_count).toLocaleString("ar")}</td>
                  <td className="p-3 text-muted-foreground">{t.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const Stat = ({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent?: boolean }) => (
  <Card className={`p-4 ${accent ? "border-emerald-500/30 bg-emerald-500/5" : ""}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold mt-1">{value}</p>
      </div>
      <Icon className={`w-8 h-8 ${accent ? "text-emerald-500" : "text-primary/60"}`} />
    </div>
  </Card>
);

const TablesTab = ({
  schema, callVps, onRefresh,
}: { schema: Schema | null; callVps: any; onRefresh: () => void }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const tableNames = useMemo(() => Object.keys(schema?.tables || {}).sort(), [schema]);
  useEffect(() => { if (!selected && tableNames[0]) setSelected(tableNames[0]); }, [tableNames, selected]);

  const cols = (selected && schema?.tables[selected]) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      <Card className="p-2 max-h-[600px] overflow-auto">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {tableNames.length} جدول
        </div>
        {tableNames.map((name) => (
          <button
            key={name}
            onClick={() => setSelected(name)}
            className={`w-full text-right px-3 py-2 rounded-md text-sm font-mono transition-colors ${
              selected === name ? "bg-primary/10 text-primary" : "hover:bg-muted"
            }`}
          >
            {name}
          </button>
        ))}
      </Card>

      <Card className="p-4">
        {selected ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold font-mono">{selected}</h3>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="w-4 h-4 ml-1" /> إضافة عمود
              </Button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-right">
                    <th className="p-2">العمود</th>
                    <th className="p-2">النوع</th>
                    <th className="p-2">Nullable</th>
                    <th className="p-2">Default</th>
                  </tr>
                </thead>
                <tbody>
                  {cols.map((c) => (
                    <tr key={c.column} className="border-t">
                      <td className="p-2 font-mono">{c.column}</td>
                      <td className="p-2 text-muted-foreground">{c.type}</td>
                      <td className="p-2">{c.nullable ? "✓" : "—"}</td>
                      <td className="p-2 font-mono text-xs text-muted-foreground">{c.default || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : <p className="text-muted-foreground">اختر جدولاً.</p>}

        <AddColumnDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          table={selected}
          callVps={callVps}
          onDone={onRefresh}
        />
      </Card>
    </div>
  );
};

const AddColumnDialog = ({
  open, onClose, table, callVps, onDone,
}: { open: boolean; onClose: () => void; table: string | null; callVps: any; onDone: () => void }) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("TEXT");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.match(/^[a-z_][a-z0-9_]*$/i)) return toast.error("اسم العمود غير صالح");
    setBusy(true);
    try {
      await callVps("add-column", { table, column: name, type });
      toast.success(`تمت إضافة العمود ${name}`);
      onDone(); onClose(); setName(""); setType("TEXT");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>إضافة عمود إلى {table}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>اسم العمود</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثل: notes" />
          </div>
          <div>
            <Label>النوع</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PG_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">يستخدم <code>ALTER TABLE ADD COLUMN IF NOT EXISTS</code> — آمن.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DataTab = ({ schema, callVps }: { schema: Schema | null; callVps: any }) => {
  const tableNames = useMemo(() => Object.keys(schema?.tables || {}).sort(), [schema]);
  const [table, setTable] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [data, setData] = useState<{ rows: any[]; columns: any[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);
  const [newRow, setNewRow] = useState<any | null>(null);

  useEffect(() => { if (!table && tableNames[0]) setTable(tableNames[0]); }, [tableNames, table]);

  const load = useCallback(async () => {
    if (!table) return;
    setLoading(true);
    try {
      const r = await callVps("table-data", { table, search, page, page_size: pageSize });
      setData({ rows: r.rows, columns: r.columns, total: r.total });
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [table, search, page, pageSize, callVps]);

  useEffect(() => { load(); }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const columns: Column[] = data?.columns?.length
    ? data.columns
    : (data?.rows[0] ? inferColumnsFromRow(data.rows[0]) : []);

  const remove = async (id: string) => {
    if (!confirm("حذف هذا الصف؟")) return;
    try { await callVps("row-delete", { table, id }); toast.success("تم الحذف"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={table} onValueChange={(v) => { setTable(v); setPage(1); }}>
          <SelectTrigger className="w-56"><SelectValue placeholder="اختر جدولاً" /></SelectTrigger>
          <SelectContent>
            {tableNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="بحث..."
            className="pr-9"
          />
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
        <Button size="sm" onClick={() => setNewRow({})}>
          <Plus className="w-4 h-4 ml-1" /> صف جديد
        </Button>
      </div>

      {data && (
        <div className="overflow-auto border rounded-md max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr className="text-right">
                {columns.map((c) => <th key={c.column} className="p-2 font-mono text-xs">{c.column}</th>)}
                <th className="p-2 w-24">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={r.id || i} className="border-t hover:bg-muted/30">
                  {columns.map((c) => (
                    <td key={c.column} className="p-2 max-w-[240px] truncate font-mono text-xs">
                      {formatCell(r[c.column])}
                    </td>
                  ))}
                  <td className="p-2 flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditRow(r)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(r.id)} disabled={!r.id}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!data.rows.length && (
                <tr><td colSpan={columns.length + 1} className="p-6 text-center text-muted-foreground">لا توجد نتائج</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {data.total.toLocaleString("ar")} صف — صفحة {page} من {totalPages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>التالي</Button>
          </div>
        </div>
      )}

      <RowEditor
        open={!!editRow}
        title="تعديل صف"
        row={editRow || {}}
        columns={columns}
        onClose={() => setEditRow(null)}
        onSave={async (row) => {
          try {
            await callVps("row-update", { table, id: editRow.id, row });
            toast.success("تم التحديث"); setEditRow(null); load();
          } catch (e: any) { toast.error(e.message); }
        }}
      />
      <RowEditor
        open={!!newRow}
        title="صف جديد"
        row={newRow || {}}
        columns={columns}
        onClose={() => setNewRow(null)}
        onSave={async (row) => {
          try {
            await callVps("row-insert", { table, row });
            toast.success("تم الإنشاء"); setNewRow(null); load();
          } catch (e: any) { toast.error(e.message); }
        }}
      />
    </Card>
  );
};

const RowEditor = ({
  open, title, row, columns, onClose, onSave,
}: {
  open: boolean; title: string; row: any; columns: Column[];
  onClose: () => void; onSave: (row: any) => void;
}) => {
  const [draft, setDraft] = useState<any>({});
  useEffect(() => { setDraft({ ...row }); }, [row, open]);
  const editable = columns.filter((c) => c.column !== "id" && c.column !== "created_at" && c.column !== "updated_at");
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-auto">
          {editable.map((c) => (
            <div key={c.column}>
              <Label className="font-mono text-xs">{c.column} <span className="text-muted-foreground">({c.type})</span></Label>
              {c.type.includes("json") ? (
                <Textarea
                  className="font-mono text-xs"
                  rows={3}
                  value={typeof draft[c.column] === "string" ? draft[c.column] : JSON.stringify(draft[c.column] ?? "", null, 2)}
                  onChange={(e) => {
                    try { setDraft({ ...draft, [c.column]: JSON.parse(e.target.value) }); }
                    catch { setDraft({ ...draft, [c.column]: e.target.value }); }
                  }}
                />
              ) : (
                <Input
                  value={draft[c.column] ?? ""}
                  onChange={(e) => setDraft({ ...draft, [c.column]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => onSave(draft)}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const QueryTab = ({ callVps }: { callVps: any }) => {
  const [sql, setSql] = useState("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1;");
  const [allowWrite, setAllowWrite] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true); setResult(null);
    try {
      const r = await callVps("query", { sql, allow_write: allowWrite });
      setResult(r);
      toast.success(`${r.rowCount ?? r.rows?.length ?? 0} صف — ${r.duration_ms}ms`);
    } catch (e: any) { setResult({ error: e.message }); toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={allowWrite}
            onCheckedChange={(v) => { if (v && !confirm("تفعيل وضع الكتابة (INSERT/UPDATE/DELETE)؟")) return; setAllowWrite(v); }}
          />
          <Label className="cursor-pointer flex items-center gap-1 text-sm">
            {allowWrite ? <ShieldAlert className="w-4 h-4 text-amber-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            وضع الكتابة {allowWrite ? "(مفعّل)" : "(SELECT فقط)"}
          </Label>
        </div>
        <Button onClick={run} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Play className="w-4 h-4 ml-2" />}
          تنفيذ
        </Button>
      </div>
      <Textarea
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        rows={6}
        className="font-mono text-sm"
        placeholder="SELECT * FROM ..."
      />
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <ShieldAlert className="w-3 h-3" /> العمليات الخطيرة (DROP TABLE / TRUNCATE) محظورة دائماً.
      </p>

      {result?.error && (
        <Card className="p-3 border-destructive/40 bg-destructive/5">
          <p className="text-sm text-destructive font-mono">{result.error}</p>
        </Card>
      )}
      {result?.rows && (
        <div className="overflow-auto border rounded-md max-h-[400px]">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr className="text-right">
                {(result.fields || Object.keys(result.rows[0] || {})).map((f: string) => (
                  <th key={f} className="p-2 font-mono text-xs">{f}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r: any, i: number) => (
                <tr key={i} className="border-t">
                  {(result.fields || Object.keys(r)).map((f: string) => (
                    <td key={f} className="p-2 font-mono text-xs max-w-[300px] truncate">{formatCell(r[f])}</td>
                  ))}
                </tr>
              ))}
              {!result.rows.length && <tr><td className="p-4 text-center text-muted-foreground">لا نتائج</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

const MigrationsTab = ({ callVps }: { callVps: any }) => {
  const [migrating, setMigrating] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const [ev, au] = await Promise.all([
        callVps("schema-events").catch(() => ({ rows: [] })),
        callVps("audit-log").catch(() => ({ rows: [] })),
      ]);
      setEvents(ev.rows || []); setAudit(au.rows || []);
    } catch (_) { /* */ }
  }, [callVps]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const runMigrations = async () => {
    setMigrating(true);
    try {
      const r = await callVps("migrate");
      setResults(r.results || []);
      toast.success(`تم تطبيق ${(r.results || []).filter((x: any) => x.applied).length} ترحيل جديد`);
      loadHistory();
    } catch (e: any) { toast.error(e.message); }
    finally { setMigrating(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Wand2 className="w-4 h-4" /> تشغيل الترحيلات المعلّقة</h3>
          <p className="text-xs text-muted-foreground mt-1">يطبق ملفات SQL من مجلد <code>migrations/</code> على VPS — إضافي فقط.</p>
        </div>
        <Button onClick={runMigrations} disabled={migrating}>
          {migrating ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Play className="w-4 h-4 ml-2" />}
          تشغيل
        </Button>
      </Card>

      {results && (
        <Card className="p-4">
          <h4 className="font-semibold mb-2">نتيجة آخر تشغيل</h4>
          <ul className="text-sm space-y-1 font-mono">
            {results.map((r, i) => (
              <li key={i} className="flex items-center gap-2">
                {r.applied
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : <span className="text-muted-foreground">○</span>}
                <span>{r.name}</span>
                <span className="text-muted-foreground text-xs">— {r.applied ? `${r.duration_ms}ms` : r.reason}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2"><History className="w-4 h-4" /> أحداث المخطط (تلقائية)</h4>
          <div className="space-y-2 max-h-[300px] overflow-auto text-sm">
            {events.length === 0 && <p className="text-muted-foreground">لا توجد أحداث.</p>}
            {events.map((e, i) => (
              <div key={i} className="border-r-2 border-primary/40 pr-2 py-1">
                <div className="font-mono text-xs">{e.event_type} — {e.table_name || ""} {e.column_name || ""}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString("ar")}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> سجل العمليات الإدارية</h4>
          <div className="space-y-2 max-h-[300px] overflow-auto text-sm">
            {audit.length === 0 && <p className="text-muted-foreground">لا يوجد سجل.</p>}
            {audit.map((a, i) => (
              <div key={i} className={`border-r-2 pr-2 py-1 ${a.success ? "border-emerald-500/40" : "border-destructive/60"}`}>
                <div className="font-mono text-xs">
                  {a.action} → {a.target} <span className="text-muted-foreground">({a.actor})</span>
                </div>
                <div className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString("ar")}</div>
                {a.error && <div className="text-[10px] text-destructive">{a.error}</div>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DatabaseManager;
