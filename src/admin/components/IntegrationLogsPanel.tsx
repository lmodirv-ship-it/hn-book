import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { integrationsService, type IntegrationLog } from "@/services/integrationsService";

const PROVIDERS = ["all", "stripe", "whatsapp", "analytics"] as const;

export default function IntegrationLogsPanel() {
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<typeof PROVIDERS[number]>("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await integrationsService.listLogs({
        provider: provider === "all" ? undefined : provider,
        limit: 100,
      });
      setLogs(data);
    } catch (e) {
      toast.error(`تعذّر تحميل السجلات: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [provider]);

  const handleClear = async () => {
    if (!confirm("هل تريد حذف كل السجلات للفلتر الحالي؟")) return;
    try {
      await integrationsService.clearLogs({ provider: provider === "all" ? undefined : provider });
      toast.success("تم حذف السجلات");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>سجل استدعاءات التكاملات</CardTitle>
            <CardDescription>كل اختبار اتصال أو رسالة تجريبية يُسجَّل هنا تلقائياً</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={provider} onValueChange={(v) => setProvider(v as typeof PROVIDERS[number])}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>{p === "all" ? "الكل" : p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={handleClear}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">لا توجد سجلات بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-start p-2">الوقت</th>
                  <th className="text-start p-2">التكامل</th>
                  <th className="text-start p-2">الإجراء</th>
                  <th className="text-start p-2">الحالة</th>
                  <th className="text-start p-2">HTTP</th>
                  <th className="text-start p-2">المدة</th>
                  <th className="text-start p-2">الرسالة</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b last:border-0 align-top">
                    <td className="p-2 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="p-2 font-medium">{l.provider}</td>
                    <td className="p-2 text-xs">{l.action}</td>
                    <td className="p-2">
                      {l.success
                        ? <Badge className="bg-green-600 hover:bg-green-700">نجح</Badge>
                        : <Badge variant="destructive">فشل</Badge>}
                    </td>
                    <td className="p-2 text-xs">{l.status_code ?? "—"}</td>
                    <td className="p-2 text-xs">{l.duration_ms ? `${l.duration_ms}ms` : "—"}</td>
                    <td className="p-2 text-xs max-w-xs truncate" title={l.message ?? ""}>{l.message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
