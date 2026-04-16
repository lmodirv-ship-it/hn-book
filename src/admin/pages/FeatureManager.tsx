import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ToggleLeft, ToggleRight, RefreshCw, Loader2, Settings2,
  Zap, Brain, Upload, DollarSign, ShoppingCart, Layout, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  category: string;
  updated_at: string;
}

interface SystemConfig {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  ai: Brain, import: Upload, pricing: DollarSign,
  ui: Layout, sales: Zap, orders: ShoppingCart,
  products: Package, general: Settings2,
};

const CATEGORY_LABELS: Record<string, string> = {
  ai: "ذكاء اصطناعي", import: "استيراد", pricing: "تسعير",
  ui: "واجهة", sales: "مبيعات", orders: "طلبات",
  products: "منتجات", general: "عام", upload: "رفع",
};

const FeatureManager = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"flags" | "config">("flags");

  const fetchData = useCallback(async () => {
    const [flagsRes, configRes] = await Promise.all([
      supabase.from("feature_flags").select("*").order("category").order("key"),
      supabase.from("system_config").select("*").order("category").order("key"),
    ]);
    if (flagsRes.data) setFlags(flagsRes.data as any);
    if (configRes.data) setConfigs(configRes.data as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleFlag = async (id: string, enabled: boolean) => {
    const { error } = await supabase.from("feature_flags").update({ enabled }).eq("id", id);
    if (error) { toast.error("فشل التحديث"); return; }
    setFlags((prev) => prev.map((f) => f.id === id ? { ...f, enabled } : f));
    toast.success(enabled ? "تم التفعيل ✓" : "تم التعطيل ✗");
  };

  const updateConfig = async (id: string, value: any) => {
    const { error } = await supabase.from("system_config").update({ value }).eq("id", id);
    if (error) { toast.error("فشل التحديث"); return; }
    setConfigs((prev) => prev.map((c) => c.id === id ? { ...c, value } : c));
    toast.success("تم حفظ الإعداد");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const categories = [...new Set(flags.map((f) => f.category))];

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">مدير الميزات والإعدادات</h1>
            <p className="text-sm text-muted-foreground">تحكم كامل بجميع ميزات النظام</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 ml-1" /> تحديث
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{flags.filter((f) => f.enabled).length}</p>
          <p className="text-xs text-muted-foreground">مفعّلة</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{flags.filter((f) => !f.enabled).length}</p>
          <p className="text-xs text-muted-foreground">معطّلة</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{configs.length}</p>
          <p className="text-xs text-muted-foreground">إعدادات</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${tab === "flags" ? "bg-primary/10 text-primary font-semibold border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("flags")}
        >
          <span className="flex items-center gap-1"><ToggleRight className="w-3 h-3" /> الميزات ({flags.length})</span>
        </button>
        <button
          className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${tab === "config" ? "bg-primary/10 text-primary font-semibold border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("config")}
        >
          <span className="flex items-center gap-1"><Settings2 className="w-3 h-3" /> الإعدادات ({configs.length})</span>
        </button>
      </div>

      {/* Flags */}
      {tab === "flags" && (
        <div className="space-y-6">
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat] || Settings2;
            const catFlags = flags.filter((f) => f.category === cat);
            return (
              <div key={cat}>
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4" /> {CATEGORY_LABELS[cat] || cat}
                </h3>
                <div className="space-y-2">
                  {catFlags.map((flag) => (
                    <motion.div
                      key={flag.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
                    >
                      <div className="flex items-center gap-3">
                        {flag.enabled ? (
                          <ToggleRight className="w-5 h-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{flag.label || flag.key}</p>
                          {flag.description && (
                            <p className="text-xs text-muted-foreground">{flag.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={flag.enabled ? "default" : "secondary"} className="text-[10px]">
                          {flag.key}
                        </Badge>
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={(val) => toggleFlag(flag.id, val)}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Config */}
      {tab === "config" && (
        <div className="space-y-2">
          {configs.map((cfg) => (
            <motion.div
              key={cfg.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
            >
              <div>
                <p className="text-sm font-medium">{cfg.description || cfg.key}</p>
                <p className="text-xs text-muted-foreground font-mono">{cfg.key}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{cfg.category}</Badge>
                <input
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-32 text-left"
                  defaultValue={typeof cfg.value === "string" ? cfg.value : JSON.stringify(cfg.value)}
                  onBlur={(e) => {
                    try {
                      const val = JSON.parse(e.target.value);
                      updateConfig(cfg.id, val);
                    } catch {
                      updateConfig(cfg.id, e.target.value);
                    }
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeatureManager;
