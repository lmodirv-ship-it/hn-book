import { useEffect, useState } from "react";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  printPricingService, ASSET_TYPES, PAPER_SIZE_OPTIONS,
  type PrintPricingRule,
} from "@/services/printPricingService";

const ruleSchema = z.object({
  asset_type: z.string().min(2).max(10),
  quantity: z.coerce.number().int().positive().max(100000),
  base_price: z.coerce.number().nonnegative().max(1_000_000),
  shipping_price: z.coerce.number().nonnegative().max(1_000_000),
  paper_size: z.string().max(20).optional().nullable(),
  is_active: z.boolean().default(true),
});

type FormState = {
  asset_type: string;
  quantity: string;
  base_price: string;
  shipping_price: string;
  paper_size: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  asset_type: "CRD",
  quantity: "100",
  base_price: "0",
  shipping_price: "0",
  paper_size: "",
  is_active: true,
};

export default function PrintPricingManagement() {
  const [rules, setRules] = useState<PrintPricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PrintPricingRule | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PrintPricingRule | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setRules(await printPricingService.list());
    } catch (e: any) {
      toast({ title: "خطأ في تحميل القواعد", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (rule: PrintPricingRule) => {
    setEditing(rule);
    setForm({
      asset_type: rule.asset_type,
      quantity: String(rule.quantity),
      base_price: String(rule.base_price),
      shipping_price: String(rule.shipping_price),
      paper_size: rule.paper_size ?? "",
      is_active: rule.is_active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    const parsed = ruleSchema.safeParse({
      ...form,
      paper_size: form.paper_size || null,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast({ title: "بيانات غير صالحة", description: first.message, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        asset_type: parsed.data.asset_type,
        quantity: parsed.data.quantity,
        base_price: parsed.data.base_price,
        shipping_price: parsed.data.shipping_price,
        paper_size: parsed.data.paper_size ?? null,
        is_active: parsed.data.is_active,
      };
      if (editing) {
        await printPricingService.update(editing.id, payload);
        toast({ title: "تم تحديث القاعدة ✅" });
      } else {
        await printPricingService.create(payload);
        toast({ title: "تم إنشاء القاعدة ✅" });
      }
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast({ title: "فشل الحفظ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await printPricingService.remove(confirmDelete.id);
      toast({ title: "تم الحذف" });
      setConfirmDelete(null);
      await load();
    } catch (e: any) {
      toast({ title: "فشل الحذف", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            إدارة تسعير الطباعة
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            عرّف الأسعار حسب نوع الأصل، الكمية، ومقاس الورق. تُستخدم تلقائياً عند إنشاء طلبات الطباعة.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="w-4 h-4" /> قاعدة جديدة
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : rules.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            لا توجد قواعد تسعير بعد. أنشئ أول قاعدة لتفعيل التسعير الديناميكي.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">الكمية</TableHead>
                <TableHead className="text-right">المقاس</TableHead>
                <TableHead className="text-right">سعر الطباعة</TableHead>
                <TableHead className="text-right">سعر الشحن</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right w-32">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono font-semibold">{r.asset_type}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell>
                    {r.paper_size ? <Badge variant="outline">{r.paper_size}</Badge> : <span className="text-muted-foreground text-xs">أي مقاس</span>}
                  </TableCell>
                  <TableCell className="font-medium">{Number(r.base_price).toFixed(2)} د.م</TableCell>
                  <TableCell>{Number(r.shipping_price).toFixed(2)} د.م</TableCell>
                  <TableCell>
                    {r.is_active ? (
                      <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/20">مفعّل</Badge>
                    ) : (
                      <Badge variant="secondary">معطّل</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(r)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل قاعدة التسعير" : "قاعدة تسعير جديدة"}</DialogTitle>
            <DialogDescription>
              عرّف السعر لتركيبة محددة من النوع والكمية والمقاس.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>نوع الأصل</Label>
              <Select value={form.asset_type} onValueChange={(v) => setForm((f) => ({ ...f, asset_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الكمية</Label>
                <Input
                  type="number" min={1} className="mt-1"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div>
                <Label>مقاس الورق</Label>
                <Select value={form.paper_size} onValueChange={(v) => setForm((f) => ({ ...f, paper_size: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAPER_SIZE_OPTIONS.map((s) => (
                      <SelectItem key={s.value || "any"} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>سعر الطباعة (د.م)</Label>
                <Input
                  type="number" min={0} step="0.01" className="mt-1"
                  value={form.base_price}
                  onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))}
                />
              </div>
              <div>
                <Label>سعر الشحن (د.م)</Label>
                <Input
                  type="number" min={0} step="0.01" className="mt-1"
                  value={form.shipping_price}
                  onChange={(e) => setForm((f) => ({ ...f, shipping_price: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>مفعّل</Label>
                <p className="text-xs text-muted-foreground">القواعد المعطّلة لا تُستخدم في حساب أسعار الطلبات.</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>إلغاء</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              {editing ? "تحديث" : "إنشاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف قاعدة التسعير؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف القاعدة نهائياً. لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
