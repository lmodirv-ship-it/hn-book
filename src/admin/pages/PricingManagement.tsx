import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, Plus, Trash2, Save, Sparkles, Edit2, X, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PricingRule {
  id: string;
  label: string;
  country: string;
  paper_type: string;
  min_pages: number;
  max_pages: number;
  price_per_page: number;
  is_active: boolean;
  priority: number;
}

interface BasePriceSetting {
  value: number;
  currency: string;
}

const COUNTRIES = [
  { code: "MA", label: "🇲🇦 المغرب" },
  { code: "DZ", label: "🇩🇿 الجزائر" },
  { code: "TN", label: "🇹🇳 تونس" },
  { code: "EG", label: "🇪🇬 مصر" },
  { code: "SA", label: "🇸🇦 السعودية" },
  { code: "AE", label: "🇦🇪 الإمارات" },
  { code: "FR", label: "🇫🇷 فرنسا" },
  { code: "US", label: "🇺🇸 أمريكا" },
  { code: "ALL", label: "🌍 الكل" },
];

const PAPER_TYPES = [
  { code: "standard", label: "عادي" },
  { code: "premium", label: "فاخر" },
  { code: "glossy", label: "لامع" },
];

const PricingManagement = () => {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [basePrice, setBasePrice] = useState<BasePriceSetting>({ value: 1, currency: "MAD" });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PricingRule>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState<Partial<PricingRule>>({
    label: "",
    country: "MA",
    paper_type: "standard",
    min_pages: 1,
    max_pages: 100,
    price_per_page: 1,
    is_active: true,
    priority: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [rulesRes, settingsRes] = await Promise.all([
      supabase.from("pricing_rules").select("*").order("country").order("priority", { ascending: true }),
      supabase.from("pricing_settings").select("*").eq("key", "base_price_per_page").single(),
    ]);
    if (rulesRes.data) setRules(rulesRes.data as unknown as PricingRule[]);
    if (settingsRes.data) {
      const val = settingsRes.data.value as any;
      setBasePrice({ value: val?.value ?? 1, currency: val?.currency ?? "MAD" });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveBasePrice = async () => {
    const { error } = await supabase
      .from("pricing_settings")
      .update({ value: { value: basePrice.value, currency: basePrice.currency } as any })
      .eq("key", "base_price_per_page");
    if (error) toast.error("فشل الحفظ");
    else toast.success("تم حفظ السعر الأساسي");
  };

  const addRule = async () => {
    const { error } = await supabase.from("pricing_rules").insert(newRule as any);
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة القاعدة");
    setShowAdd(false);
    setNewRule({ label: "", country: "MA", paper_type: "standard", min_pages: 1, max_pages: 100, price_per_page: 1, is_active: true, priority: 0 });
    fetchData();
  };

  const updateRule = async (id: string, updates: Partial<PricingRule>) => {
    const { error } = await supabase.from("pricing_rules").update(updates as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    setEditingId(null);
    toast.success("تم التحديث");
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase.from("pricing_rules").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success("تم الحذف");
  };

  const startEdit = (rule: PricingRule) => {
    setEditingId(rule.id);
    setEditForm({ ...rule });
  };

  const countryLabel = (code: string) => COUNTRIES.find(c => c.code === code)?.label || code;
  const paperLabel = (code: string) => PAPER_TYPES.find(p => p.code === code)?.label || code;

  // Preview price calculation
  const previewPrice = (pages: number) => {
    const matching = rules
      .filter(r => r.is_active && pages >= r.min_pages && pages <= r.max_pages)
      .sort((a, b) => b.priority - a.priority);
    const rule = matching[0];
    return rule ? pages * rule.price_per_page : pages * basePrice.value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground">💰 إدارة التسعير</h1>
        <p className="text-sm text-muted-foreground mt-1">قواعد تسعير ديناميكية حسب البلد ونوع الورق ونطاق الصفحات</p>
      </motion.div>

      {/* Base price */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" /> السعر الأساسي لكل صفحة (احتياطي)
        </h2>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={0}
            step={0.1}
            value={basePrice.value}
            onChange={(e) => setBasePrice(prev => ({ ...prev, value: Number(e.target.value) }))}
            className="w-32 bg-background"
          />
          <span className="text-sm text-muted-foreground">د.م / صفحة</span>
          <Button size="sm" onClick={saveBasePrice} className="gap-1.5">
            <Save className="w-3.5 h-3.5" /> حفظ
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">يُستخدم عند عدم تطابق أي قاعدة مع عدد الصفحات</p>
      </motion.div>

      {/* Price preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-primary/20 bg-primary/5 p-5"
      >
        <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> معاينة السعر
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[50, 150, 300, 500].map(pages => (
            <div key={pages} className="rounded-xl bg-background border border-border p-3">
              <p className="text-xs text-muted-foreground">{pages} صفحة</p>
              <p className="text-lg font-bold text-primary mt-1">{previewPrice(pages).toFixed(0)} د.م</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Rules header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">📋 قواعد التسعير ({rules.length})</h2>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAdd ? "إلغاء" : "إضافة قاعدة"}
        </Button>
      </div>

      {/* Add rule form */}
      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-2xl border border-primary/30 bg-card p-4 space-y-3"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">الوصف</label>
              <Input value={newRule.label} onChange={(e) => setNewRule(p => ({ ...p, label: e.target.value }))} className="bg-background" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">البلد</label>
              <Select value={newRule.country} onValueChange={(v) => setNewRule(p => ({ ...p, country: v }))}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">نوع الورق</label>
              <Select value={newRule.paper_type} onValueChange={(v) => setNewRule(p => ({ ...p, paper_type: v }))}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAPER_TYPES.map(p => <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">الأولوية</label>
              <Input type="number" value={newRule.priority} onChange={(e) => setNewRule(p => ({ ...p, priority: Number(e.target.value) }))} className="bg-background" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">أقل صفحات</label>
              <Input type="number" min={0} value={newRule.min_pages} onChange={(e) => setNewRule(p => ({ ...p, min_pages: Number(e.target.value) }))} className="bg-background" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">أكثر صفحات</label>
              <Input type="number" min={0} value={newRule.max_pages} onChange={(e) => setNewRule(p => ({ ...p, max_pages: Number(e.target.value) }))} className="bg-background" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">سعر/صفحة (د.م)</label>
              <Input type="number" min={0} step={0.1} value={newRule.price_per_page} onChange={(e) => setNewRule(p => ({ ...p, price_per_page: Number(e.target.value) }))} className="bg-background" />
            </div>
          </div>
          <Button onClick={addRule} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> إضافة
          </Button>
        </motion.div>
      )}

      {/* Rules table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">الوصف</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">البلد</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">نوع الورق</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">نطاق الصفحات</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">سعر/صفحة</th>
                <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">مفعّلة</th>
                <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  {editingId === rule.id ? (
                    <>
                      <td className="py-2 px-3">
                        <Input value={editForm.label} onChange={(e) => setEditForm(p => ({ ...p, label: e.target.value }))} className="h-8 text-xs bg-background" />
                      </td>
                      <td className="py-2 px-3">
                        <Select value={editForm.country} onValueChange={(v) => setEditForm(p => ({ ...p, country: v }))}>
                          <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 px-3">
                        <Select value={editForm.paper_type} onValueChange={(v) => setEditForm(p => ({ ...p, paper_type: v }))}>
                          <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PAPER_TYPES.map(p => <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <Input type="number" value={editForm.min_pages} onChange={(e) => setEditForm(p => ({ ...p, min_pages: Number(e.target.value) }))} className="h-8 w-16 text-xs bg-background" />
                          <span className="text-xs text-muted-foreground">—</span>
                          <Input type="number" value={editForm.max_pages} onChange={(e) => setEditForm(p => ({ ...p, max_pages: Number(e.target.value) }))} className="h-8 w-16 text-xs bg-background" />
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <Input type="number" step={0.1} value={editForm.price_per_page} onChange={(e) => setEditForm(p => ({ ...p, price_per_page: Number(e.target.value) }))} className="h-8 w-20 text-xs bg-background" />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Switch checked={editForm.is_active} onCheckedChange={(v) => setEditForm(p => ({ ...p, is_active: v }))} />
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => updateRule(rule.id, editForm)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-4 text-foreground font-medium">{rule.label || "—"}</td>
                      <td className="py-3 px-4 text-sm">{countryLabel(rule.country)}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">{paperLabel(rule.paper_type)}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">{rule.min_pages} — {rule.max_pages === 999999 ? "∞" : rule.max_pages}</td>
                      <td className="py-3 px-4 font-semibold text-primary">{rule.price_per_page} د.م</td>
                      <td className="py-3 px-4 text-center">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(v) => updateRule(rule.id, { is_active: v })}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEdit(rule)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteRule(rule.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rules.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">لا توجد قواعد تسعير — أضف قاعدة أولاً</div>
        )}
      </motion.div>
    </div>
  );
};

export default PricingManagement;
