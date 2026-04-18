import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Eye, RefreshCw, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { paymentService, type Payment, type PaymentProof, type PaymentStatus } from "@/services/paymentService";

type Pending = Payment & { proofs: PaymentProof[] };

const PaymentsAdmin = () => {
  const [pending, setPending] = useState<Pending[]>([]);
  const [history, setHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<Pending | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        paymentService.listAllPending(),
        paymentService.listAll(),
      ]);
      setPending(p);
      setHistory(h);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totals = {
    revenue: history.filter((h) => h.status === "paid").reduce((s, h) => s + Number(h.amount || 0), 0),
    paid: history.filter((h) => h.status === "paid").length,
    pending: pending.length,
    failed: history.filter((h) => h.status === "failed").length,
  };

  const act = async (kind: "approve" | "reject") => {
    if (!reviewing) return;
    setBusy(true);
    try {
      const fn = kind === "approve" ? paymentService.approve : paymentService.reject;
      const res = await fn(reviewing.id, note || undefined);
      if (!res.ok) throw new Error(res.reason);
      toast.success(kind === "approve" ? "تم القبول وإضافة الرصيد" : "تم الرفض");
      setReviewing(null);
      setNote("");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الدفعات اليدوية</h1>
          <p className="text-sm text-muted-foreground">مراجعة إثباتات التحويل البنكي والواتساب</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ml-2 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="إجمالي الإيرادات" value={`${totals.revenue.toFixed(2)} MAD`} accent="primary" />
        <Stat label="مدفوعات ناجحة" value={totals.paid} />
        <Stat label="بانتظار المراجعة" value={totals.pending} accent="amber" />
        <Stat label="مدفوعات فاشلة" value={totals.failed} accent="red" />
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">قيد المراجعة ({pending.length})</TabsTrigger>
          <TabsTrigger value="history">السجل الكامل</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {loading ? (
            <Loader />
          ) : pending.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">لا توجد دفعات بانتظار المراجعة ✅</Card>
          ) : (
            <div className="grid gap-3">
              {pending.map((p) => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-xs font-mono text-muted-foreground">{p.id.slice(0, 8)}</code>
                        <Badge variant="outline">{p.purpose === "credits" ? "شحن رصيد" : "طلب طباعة"}</Badge>
                        {p.credits_to_add > 0 && <Badge>+{p.credits_to_add} نقطة</Badge>}
                      </div>
                      <p className="text-2xl font-bold text-primary">{Number(p.amount).toFixed(2)} {p.currency}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(p.created_at).toLocaleString("ar-MA")} • مستخدم: {p.user_id?.slice(0, 8)}
                      </p>
                      {p.proofs.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {p.proofs.map((pr) => (
                            <button
                              key={pr.id}
                              onClick={() => setPreviewUrl(pr.image_url)}
                              className="relative w-20 h-20 rounded border border-border overflow-hidden hover:border-primary"
                            >
                              <img src={pr.image_url} alt="proof" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => { setReviewing(p); setNote(""); }}
                        disabled={p.proofs.length === 0}
                      >
                        مراجعة
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {loading ? (
            <Loader />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-muted-foreground">
                    <tr>
                      <th className="text-right p-3">التاريخ</th>
                      <th className="text-right p-3">الطريقة</th>
                      <th className="text-right p-3">الغرض</th>
                      <th className="text-right p-3">المبلغ</th>
                      <th className="text-right p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className="border-t border-border">
                        <td className="p-3 text-xs">{new Date(h.created_at).toLocaleString("ar-MA")}</td>
                        <td className="p-3">{h.method}</td>
                        <td className="p-3">{h.purpose}</td>
                        <td className="p-3 font-semibold">{Number(h.amount).toFixed(2)} {h.currency}</td>
                        <td className="p-3"><StatusBadge status={h.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>مراجعة الدفعة</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="المبلغ" value={`${Number(reviewing.amount).toFixed(2)} ${reviewing.currency}`} />
                <Field label="الغرض" value={reviewing.purpose} />
                <Field label="رصيد للإضافة" value={String(reviewing.credits_to_add)} />
                <Field label="مستخدم" value={reviewing.user_id?.slice(0, 8) || "—"} />
              </div>
              {reviewing.print_order_id && (
                <Field label="طلب طباعة مرتبط" value={reviewing.print_order_id} mono />
              )}
              {reviewing.proofs.map((pr) => (
                <a key={pr.id} href={pr.image_url} target="_blank" rel="noopener noreferrer">
                  <img src={pr.image_url} alt="proof" className="w-full max-h-64 object-contain rounded border border-border" />
                </a>
              ))}
              <Textarea
                placeholder="ملاحظة (اختياري)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => act("reject")} disabled={busy}>
              <XCircle className="w-4 h-4 ml-1" /> رفض
            </Button>
            <Button onClick={() => act("approve")} disabled={busy}>
              <CheckCircle2 className="w-4 h-4 ml-1" /> قبول وإضافة الرصيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview */}
      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl">
          {previewUrl && <img src={previewUrl} alt="proof" className="w-full" />}
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
              فتح في تبويب جديد <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Loader = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

const Stat = ({ label, value, accent }: { label: string; value: string | number; accent?: "primary" | "amber" | "red" }) => (
  <Card className="p-4">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className={`text-xl font-bold ${
      accent === "primary" ? "text-primary" : accent === "amber" ? "text-amber-500" : accent === "red" ? "text-destructive" : ""
    }`}>{value}</p>
  </Card>
);

const Field = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`font-semibold ${mono ? "font-mono text-xs break-all" : ""}`}>{value}</p>
  </div>
);

const StatusBadge = ({ status }: { status: PaymentStatus }) => {
  const map = {
    paid: { label: "مدفوع", cls: "bg-primary/20 text-primary" },
    pending: { label: "قيد الانتظار", cls: "bg-amber-500/20 text-amber-500" },
    failed: { label: "فاشل", cls: "bg-destructive/20 text-destructive" },
    refunded: { label: "مسترد", cls: "bg-muted text-muted-foreground" },
  };
  const m = map[status];
  return <span className={`px-2 py-0.5 rounded text-xs ${m.cls}`}>{m.label}</span>;
};

export default PaymentsAdmin;
