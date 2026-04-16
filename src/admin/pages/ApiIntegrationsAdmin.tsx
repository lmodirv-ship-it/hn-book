import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Globe, Plus, RefreshCw, Loader2, Trash2, Edit3, Save, X,
  CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ApiIntegration {
  id: string;
  name: string;
  base_url: string;
  api_key_name: string;
  is_active: boolean;
  category: string;
  description: string;
}

const ApiIntegrationsAdmin = () => {
  const [integrations, setIntegrations] = useState<ApiIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", base_url: "", api_key_name: "", category: "general", description: "" });

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from("api_integrations").select("*").order("category").order("name");
    if (data) setIntegrations(data as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addIntegration = async () => {
    if (!form.name.trim() || !form.base_url.trim()) { toast.error("الاسم والرابط مطلوبان"); return; }
    const { error } = await supabase.from("api_integrations").insert(form);
    if (error) { toast.error("فشلت الإضافة"); return; }
    toast.success("تمت الإضافة");
    setAdding(false);
    setForm({ name: "", base_url: "", api_key_name: "", category: "general", description: "" });
    fetchData();
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await supabase.from("api_integrations").update({ is_active }).eq("id", id);
    setIntegrations((prev) => prev.map((i) => i.id === id ? { ...i, is_active } : i));
    toast.success(is_active ? "تم التفعيل" : "تم التعطيل");
  };

  const deleteIntegration = async (id: string) => {
    await supabase.from("api_integrations").delete().eq("id", id);
    setIntegrations((prev) => prev.filter((i) => i.id !== id));
    toast.success("تم الحذف");
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
          <Button size="sm" onClick={() => setAdding(true)}><Plus className="w-4 h-4 ml-1" /> إضافة API</Button>
        </div>
      </div>

      {/* Add Form */}
      {adding && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="اسم الخدمة" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="الرابط الأساسي (base_url)" value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} />
            <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="اسم مفتاح API (اختياري)" value={form.api_key_name} onChange={(e) => setForm({ ...form, api_key_name: e.target.value })} />
            <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="general">عام</option>
              <option value="payment">دفع</option>
              <option value="shipping">شحن</option>
              <option value="ai">ذكاء اصطناعي</option>
              <option value="storage">تخزين</option>
            </select>
          </div>
          <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="وصف (اختياري)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-2">
            <Button size="sm" onClick={addIntegration}><Save className="w-4 h-4 ml-1" /> حفظ</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}><X className="w-4 h-4 ml-1" /> إلغاء</Button>
          </div>
        </motion.div>
      )}

      {/* List */}
      {integrations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>لا توجد تكاملات بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {integrations.map((api) => (
            <motion.div key={api.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                {api.is_active ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium">{api.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{api.base_url}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[10px]">{api.category}</Badge>
                <Switch checked={api.is_active} onCheckedChange={(v) => toggleActive(api.id, v)} />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => deleteIntegration(api.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApiIntegrationsAdmin;
