import { useState, useEffect, useMemo } from "react";
import {
  Ticket, Plus, Trash2, Copy, Loader2, Search, Download, Edit2,
  BarChart3, CheckCircle2, XCircle, Clock, Filter, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  max_discount: number | null;
  min_order_amount: number;
  max_uses: number;
  max_uses_per_user: number;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  applies_to: string;
  created_at: string;
}

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "HN";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const defaultForm = () => ({
  code: generateCode(),
  description: "",
  discount_type: "percentage",
  discount_value: 10,
  max_discount: 50,
  min_order_amount: 0,
  max_uses: 0,
  max_uses_per_user: 1,
  is_active: true,
  expires_at: "",
  applies_to: "all",
});

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) => (
  <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  </div>
);

const CouponFormDialog = ({
  open, onOpenChange, form, setForm, onSave, saving, isEdit,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  form: ReturnType<typeof defaultForm>; setForm: (f: ReturnType<typeof defaultForm>) => void;
  onSave: () => void; saving: boolean; isEdit: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
      <DialogHeader>
        <DialogTitle>{isEdit ? "تعديل الكوبون" : "إنشاء كوبون خصم جديد"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>كود الكوبون</Label>
          <div className="flex gap-2">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="font-mono tracking-widest" disabled={isEdit} />
            {!isEdit && <Button variant="outline" size="icon" onClick={() => setForm({ ...form, code: generateCode() })}>🔄</Button>}
          </div>
        </div>
        <div>
          <Label>وصف الكوبون (اختياري)</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="مثال: خصم خاص لعملاء رمضان..." rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>نوع الخصم</Label>
            <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">نسبة مئوية %</SelectItem>
                <SelectItem value="fixed">مبلغ ثابت $</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>قيمة الخصم</Label>
            <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: +e.target.value })} />
          </div>
        </div>
        {form.discount_type === "percentage" && (
          <div>
            <Label>الحد الأقصى للخصم ($)</Label>
            <Input type="number" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: +e.target.value })} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>الحد الأدنى للطلب ($)</Label>
            <Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: +e.target.value })} />
          </div>
          <div>
            <Label>عدد الاستخدامات (0 = ∞)</Label>
            <Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: +e.target.value })} />
          </div>
        </div>
        <div>
          <Label>الحد الأقصى لكل مستخدم</Label>
          <Input type="number" value={form.max_uses_per_user} onChange={(e) => setForm({ ...form, max_uses_per_user: +e.target.value })} />
        </div>
        <div>
          <Label>ينطبق على</Label>
          <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المنتجات</SelectItem>
              <SelectItem value="books">الكتب فقط</SelectItem>
              <SelectItem value="ebooks">الكتب الرقمية فقط</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>تاريخ الانتهاء (اختياري)</Label>
          <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>مفعّل</Label>
          <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
        </div>
        <Button onClick={onSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "حفظ التعديلات" : "إنشاء الكوبون"}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

const CouponsManagement = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm());
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive" | "expired">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchCoupons = async () => {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false }) as any;
    setCoupons(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const filtered = useMemo(() => {
    let list = coupons;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.code.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q));
    }
    if (filterStatus !== "all") {
      const now = new Date();
      list = list.filter(c => {
        const expired = c.expires_at && new Date(c.expires_at) < now;
        if (filterStatus === "expired") return expired;
        if (filterStatus === "active") return c.is_active && !expired;
        if (filterStatus === "inactive") return !c.is_active && !expired;
        return true;
      });
    }
    return list;
  }, [coupons, search, filterStatus]);

  const stats = useMemo(() => {
    const now = new Date();
    const active = coupons.filter(c => c.is_active && !(c.expires_at && new Date(c.expires_at) < now)).length;
    const expired = coupons.filter(c => c.expires_at && new Date(c.expires_at) < now).length;
    const totalUsage = coupons.reduce((s, c) => s + (c.current_uses || 0), 0);
    return { total: coupons.length, active, expired, totalUsage };
  }, [coupons]);

  const handleSave = async () => {
    if (!form.code.trim() || form.discount_value <= 0) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        code: form.code.toUpperCase().trim(),
        description: form.description,
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        max_discount: form.discount_type === "percentage" ? form.max_discount : null,
        min_order_amount: form.min_order_amount,
        max_uses: form.max_uses,
        max_uses_per_user: form.max_uses_per_user,
        is_active: form.is_active,
        expires_at: form.expires_at || null,
        applies_to: form.applies_to,
      };
      if (editingId) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", editingId) as any;
        if (error) throw error;
        toast({ title: "تم تحديث الكوبون بنجاح ✅" });
      } else {
        payload.created_by = user?.id;
        const { error } = await supabase.from("coupons").insert(payload) as any;
        if (error) throw error;
        toast({ title: "تم إنشاء الكوبون بنجاح ✅" });
      }
      setShowDialog(false);
      setEditingId(null);
      setForm(defaultForm());
      fetchCoupons();
    } catch (err: any) {
      toast({ title: err.message?.includes("unique") ? "كود الكوبون موجود مسبقاً" : "حدث خطأ", variant: "destructive" });
    }
    setSaving(false);
  };

  const openEdit = (c: Coupon) => {
    setEditingId(c.id);
    setForm({
      code: c.code, description: c.description || "", discount_type: c.discount_type,
      discount_value: c.discount_value, max_discount: c.max_discount ?? 50,
      min_order_amount: c.min_order_amount ?? 0, max_uses: c.max_uses ?? 0,
      max_uses_per_user: c.max_uses_per_user ?? 1, is_active: c.is_active,
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "", applies_to: c.applies_to || "all",
    });
    setShowDialog(true);
  };

  const openCreate = () => { setEditingId(null); setForm(defaultForm()); setShowDialog(true); };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("coupons").update({ is_active: active } as any).eq("id", id);
    fetchCoupons();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    fetchCoupons();
    toast({ title: "تم حذف الكوبون" });
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    for (const id of selected) await supabase.from("coupons").delete().eq("id", id);
    setSelected(new Set());
    fetchCoupons();
    toast({ title: `تم حذف ${selected.size} كوبون` });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: `تم نسخ الكود: ${code}` });
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
  };

  const exportCSV = () => {
    const headers = ["الكود", "نوع الخصم", "القيمة", "الحد الأقصى", "الحد الأدنى للطلب", "الاستخدامات", "الحالة", "الانتهاء"];
    const rows = filtered.map(c => [
      c.code, c.discount_type === "percentage" ? "نسبة" : "ثابت", c.discount_value,
      c.max_discount ?? "-", c.min_order_amount, `${c.current_uses}/${c.max_uses === 0 ? "∞" : c.max_uses}`,
      c.is_active ? "مفعّل" : "معطّل", c.expires_at ? new Date(c.expires_at).toLocaleDateString("ar") : "-",
    ]);
    const csv = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `coupons_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Ticket className="w-6 h-6 text-primary" /> كوبونات الخصم
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5"><Download className="w-4 h-4" /> تصدير</Button>
          <Button onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" /> كوبون جديد</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Ticket} label="إجمالي الكوبونات" value={stats.total} color="bg-primary/15 text-primary" />
        <StatCard icon={CheckCircle2} label="مفعّلة" value={stats.active} color="bg-emerald-500/15 text-emerald-500" />
        <StatCard icon={XCircle} label="منتهية" value={stats.expired} color="bg-destructive/15 text-destructive" />
        <StatCard icon={BarChart3} label="إجمالي الاستخدامات" value={stats.totalUsage} color="bg-blue-500/15 text-blue-500" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالكود أو الوصف..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
          <SelectTrigger className="w-[140px]"><Filter className="w-4 h-4 ml-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="active">مفعّلة</SelectItem>
            <SelectItem value="inactive">معطّلة</SelectItem>
            <SelectItem value="expired">منتهية</SelectItem>
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <Button variant="destructive" size="sm" onClick={bulkDelete} className="gap-1.5">
            <Trash2 className="w-4 h-4" /> حذف ({selected.size})
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold">لا توجد كوبونات</p>
          <p className="text-sm mt-1">أنشئ أول كوبون خصم لعملائك</p>
          <Button onClick={openCreate} className="mt-4 gap-1.5"><Plus className="w-4 h-4" /> إنشاء كوبون</Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">
                  <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead>الكود</TableHead>
                <TableHead>الخصم</TableHead>
                <TableHead>الاستخدامات</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الانتهاء</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => {
                const expired = c.expires_at && new Date(c.expires_at) < new Date();
                return (
                  <TableRow key={c.id} className={selected.has(c.id) ? "bg-primary/5" : ""}>
                    <TableCell className="text-center"><Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">{c.code}</span>
                        <button onClick={() => copyCode(c.code)} className="p-1 hover:bg-secondary rounded"><Copy className="w-3 h-3 text-muted-foreground" /></button>
                      </div>
                      {c.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{c.description}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.discount_type === "percentage" ? `${c.discount_value}%` : `$${c.discount_value}`}</Badge>
                      {c.max_discount && c.discount_type === "percentage" && <span className="text-[10px] text-muted-foreground block">حد أقصى: ${c.max_discount}</span>}
                    </TableCell>
                    <TableCell><span className="text-sm">{c.current_uses}/{c.max_uses === 0 ? "∞" : c.max_uses}</span></TableCell>
                    <TableCell>
                      {expired ? <Badge variant="destructive" className="text-[10px]">منتهي</Badge>
                        : c.is_active ? <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">مفعّل</Badge>
                        : <Badge variant="secondary" className="text-[10px]">معطّل</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString("ar") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-secondary rounded-lg"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => toggleActive(c.id, !c.is_active)} className="p-1.5 hover:bg-secondary rounded-lg">
                          {c.is_active ? <XCircle className="w-3.5 h-3.5 text-yellow-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        </button>
                        <button onClick={() => deleteCoupon(c.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CouponFormDialog open={showDialog} onOpenChange={setShowDialog} form={form} setForm={setForm} onSave={handleSave} saving={saving} isEdit={!!editingId} />
    </div>
  );
};

export default CouponsManagement;
