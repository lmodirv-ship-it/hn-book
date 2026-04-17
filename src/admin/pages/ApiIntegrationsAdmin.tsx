import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Globe, Plus, RefreshCw, Loader2, Trash2, Edit3, Save, X,
  CheckCircle2, XCircle, KeyRound, Eye, EyeOff, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  integrationsService, maskKey,
  type ApiIntegration, type ApiIntegrationInput,
} from "@/services/integrationsService";

const CATEGORIES = [
  { value: "general", label: "عام" },
  { value: "payment", label: "دفع" },
  { value: "shipping", label: "شحن" },
  { value: "messaging", label: "مراسلة" },
  { value: "ai", label: "ذكاء اصطناعي" },
  { value: "storage", label: "تخزين" },
  { value: "analytics", label: "تحليلات" },
];

const emptyForm: ApiIntegrationInput & { config_text: string } = {
  name: "",
  base_url: "",
  api_key_name: "",
  secret_ref: "",
  key_hint: "",
  category: "general",
  description: "",
  is_active: true,
  config: {},
  config_text: "{}",
};

const ApiIntegrationsAdmin = () => {
  const [integrations, setIntegrations] = useState<ApiIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revealHint, setRevealHint] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const list = await integrationsService.list();
      setIntegrations(list);
    } catch {
      toast.error("فشل تحميل التكاملات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (i: ApiIntegration) => {
    setEditingId(i.id);
    setForm({
      name: i.name,
      base_url: i.base_url,
      api_key_name: i.api_key_name ?? "",
      secret_ref: i.secret_ref ?? "",
      key_hint: i.key_hint ?? "",
      category: i.category,
      description: i.description ?? "",
      is_active: i.is_active,
      config: i.config ?? {},
      config_text: JSON.stringify(i.config ?? {}, null, 2),
    });
    setOpen(true);
  };

  const submit = async () => {
    const name = form.name.trim();
    const base_url = form.base_url.trim();
    if (!name) return toast.error("الاسم مطلوب");
    if (!base_url) return toast.error("الرابط الأساسي مطلوب");

    let parsedConfig: Record<string, unknown> = {};
    try {
      parsedConfig = form.config_text.trim() ? JSON.parse(form.config_text) : {};
      if (typeof parsedConfig !== "object" || Array.isArray(parsedConfig)) throw new Error();
    } catch {
      return toast.error("الإعدادات (config) JSON غير صالح");
    }

    const payload: ApiIntegrationInput = {
      name,
      base_url,
      api_key_name: form.api_key_name?.trim() || null,
      secret_ref: form.secret_ref?.trim() || null,
      key_hint: form.key_hint?.trim() || null,
      category: form.category || "general",
      description: form.description?.trim() || null,
      is_active: !!form.is_active,
      config: parsedConfig,
    };

    try {
      setSaving(true);
      if (editingId) {
        await integrationsService.update(editingId, payload);
        toast.success("تم التحديث");
      } else {
        await integrationsService.create(payload);
        toast.success("تمت الإضافة");
      }
      setOpen(false);
      await fetchData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "فشل الحفظ";
      toast.error(msg.includes("duplicate") ? "اسم التكامل مستخدم بالفعل" : msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    try {
      await integrationsService.toggle(id, is_active);
      setIntegrations((prev) => prev.map((i) => i.id === id ? { ...i, is_active } : i));
      toast.success(is_active ? "تم التفعيل" : "تم التعطيل");
    } catch { toast.error("فشل التحديث"); }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف التكامل؟")) return;
    try {
      await integrationsService.remove(id);
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
      toast.success("تم الحذف");
    } catch { toast.error("فشل الحذف"); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">تكاملات API</h1>
            <p className="text-sm text-muted-foreground">إدارة الاتصالات مع الخدمات الخارجية</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4 ml-1" /> تحديث</Button>
          <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 ml-1" /> إضافة تكامل</Button>
        </div>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex items-start gap-2">
        <Shield className="w-4 h-4 mt-0.5 text-primary shrink-0" />
        <p>
          المفاتيح السرية لا تُخزَّن في قاعدة البيانات. أضِف المفتاح كسر (Secret) في إعدادات Lovable Cloud،
          ثم اربط اسم السر هنا في حقل <span className="font-mono">secret_ref</span>. ستستعمله الدوال الخلفية فقط.
        </p>
      </div>

      {integrations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>لا توجد تكاملات بعد</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-start p-3">الاسم</th>
                <th className="text-start p-3">الفئة</th>
                <th className="text-start p-3">الرابط</th>
                <th className="text-start p-3">المفتاح (مقنّع)</th>
                <th className="text-start p-3">الحالة</th>
                <th className="text-end p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((api) => {
                const revealed = revealHint[api.id];
                return (
                  <motion.tr
                    key={api.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="border-t border-border"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {api.is_active
                          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : <XCircle className="w-4 h-4 text-muted-foreground" />}
                        <div>
                          <div className="font-medium">{api.name}</div>
                          {api.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">{api.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px]">{api.category}</Badge>
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground max-w-[260px] truncate">
                      {api.base_url || "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                        <code className="text-xs">
                          {revealed ? (api.key_hint || "—") : maskKey(api.key_hint)}
                        </code>
                        {api.key_hint && (
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setRevealHint((r) => ({ ...r, [api.id]: !r[api.id] }))}
                            aria-label="toggle"
                          >
                            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {api.secret_ref && (
                          <Badge variant="secondary" className="text-[10px] font-mono">{api.secret_ref}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <Switch checked={api.is_active} onCheckedChange={(v) => toggleActive(api.id, v)} />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(api)}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => remove(api.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل تكامل" : "تكامل جديد"}</DialogTitle>
            <DialogDescription>
              عرّف خدمة خارجية. لا تضع المفتاح السري في الواجهة — استعمل اسم السر فقط.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>الاسم *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="stripe, whatsapp..." />
            </div>
            <div>
              <Label>الفئة</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>الرابط الأساسي *</Label>
              <Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://api.example.com" />
            </div>
            <div>
              <Label>اسم مفتاح API (للعرض)</Label>
              <Input value={form.api_key_name ?? ""} onChange={(e) => setForm({ ...form, api_key_name: e.target.value })} placeholder="X-Api-Key" />
            </div>
            <div>
              <Label>اسم السر (secret_ref)</Label>
              <Input className="font-mono" value={form.secret_ref ?? ""} onChange={(e) => setForm({ ...form, secret_ref: e.target.value })} placeholder="STRIPE_SECRET_KEY" />
            </div>
            <div className="md:col-span-2">
              <Label>تلميح المفتاح (آخر 4 أحرف فقط)</Label>
              <Input value={form.key_hint ?? ""} onChange={(e) => setForm({ ...form, key_hint: e.target.value })} placeholder="sk_live_…ab12" />
            </div>
            <div className="md:col-span-2">
              <Label>الوصف</Label>
              <Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>الإعدادات (JSON)</Label>
              <Textarea
                rows={6}
                className="font-mono text-xs"
                value={form.config_text}
                onChange={(e) => setForm({ ...form, config_text: e.target.value })}
                placeholder='{ "region": "eu", "mode": "live" }'
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">مفعل</p>
                <p className="text-xs text-muted-foreground">يمكن للخلفية استعمال هذا التكامل</p>
              </div>
              <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              <X className="w-4 h-4 ml-1" /> إلغاء
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiIntegrationsAdmin;
