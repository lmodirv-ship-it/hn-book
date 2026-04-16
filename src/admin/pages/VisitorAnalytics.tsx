import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Eye, Users, TrendingUp, ShoppingCart, BarChart3, Package, DollarSign,
  Activity, RefreshCw, Upload, BookOpen, Globe, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / 800, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span>{display.toLocaleString()}</span>;
};

/* ── Mini Bar Chart ── */
const MiniBarChart = ({ data, color }: { data: { label: string; value: number }[]; color: string }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px] text-muted-foreground font-medium">{d.value || ""}</span>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(d.value / max) * 100}%` }}
            transition={{ delay: i * 0.05, duration: 0.5 }}
            className="w-full rounded-t-md min-h-[2px]"
            style={{ background: `linear-gradient(to top, ${color}66, ${color})` }}
          />
          <span className="text-[8px] text-muted-foreground truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

const VisitorAnalytics = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0, activeProducts: 0, totalOrders: 0,
    pendingOrders: 0, completedOrders: 0, totalCustomers: 0, totalRevenue: 0,
  });
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});
  const [languageStats, setLanguageStats] = useState<Record<string, number>>({});
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<Record<string, number>>({});
  const [uploadTrends, setUploadTrends] = useState<{ label: string; value: number }[]>([]);
  const [topBooks, setTopBooks] = useState<{ name: string; category: string; pageCount: number; price: number }[]>([]);

  const fetchData = async () => {
    setRefreshing(true);
    const [productsRes, ordersRes, customersRes, jobsRes] = await Promise.all([
      supabase.from("products").select("*"),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("customers").select("*"),
      supabase.from("upload_jobs").select("id, status, created_at").eq("status", "done"),
    ]);

    const products = productsRes.data || [];
    const orders = ordersRes.data || [];
    const customers = customersRes.data || [];
    const doneJobs = jobsRes.data || [];

    setStats({
      totalProducts: products.length,
      activeProducts: products.filter(p => p.is_active).length,
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === "pending").length,
      completedOrders: orders.filter(o => o.status === "completed").length,
      totalCustomers: customers.length,
      totalRevenue: orders.filter(o => o.status === "completed").reduce((s, o) => s + Number(o.amount), 0),
    });

    // Category stats
    const cats: Record<string, number> = {};
    products.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
    setCategoryStats(cats);

    // Language detection from category names (Arabic vs Latin)
    const langs: Record<string, number> = {};
    products.forEach(p => {
      const hasArabic = /[\u0600-\u06FF]/.test(p.name);
      const lang = hasArabic ? "عربي" : "أجنبي";
      langs[lang] = (langs[lang] || 0) + 1;
    });
    setLanguageStats(langs);

    // Order status
    const statuses: Record<string, number> = {};
    orders.forEach(o => { statuses[o.status] = (statuses[o.status] || 0) + 1; });
    setOrdersByStatus(statuses);

    // Upload trends (last 7 days)
    const trends: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = doneJobs.filter(j => j.created_at.startsWith(key)).length;
      trends.push({ label: d.toLocaleDateString("ar-MA", { weekday: "short" }), value: count });
    }
    setUploadTrends(trends);

    // Top books by page count
    const sorted = [...products]
      .filter(p => p.page_count && p.page_count > 0)
      .sort((a, b) => (b.page_count || 0) - (a.page_count || 0))
      .slice(0, 8);
    setTopBooks(sorted.map(p => ({ name: p.name, category: p.category, pageCount: p.page_count || 0, price: Number(p.price) })));

    setRecentOrders(orders.slice(0, 10));
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, []);

  const statCards = [
    { icon: Package, label: "إجمالي الكتب", value: stats.totalProducts, gradient: "from-primary/20 to-primary/5", iconColor: "text-primary" },
    { icon: BookOpen, label: "كتب نشطة", value: stats.activeProducts, gradient: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-400" },
    { icon: ShoppingCart, label: "إجمالي الطلبات", value: stats.totalOrders, gradient: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-400" },
    { icon: Users, label: "العملاء", value: stats.totalCustomers, gradient: "from-violet-500/20 to-violet-500/5", iconColor: "text-violet-400" },
    { icon: DollarSign, label: "الإيرادات (د.م)", value: stats.totalRevenue, gradient: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-400" },
    { icon: TrendingUp, label: "طلبات مكتملة", value: stats.completedOrders, gradient: "from-rose-500/20 to-rose-500/5", iconColor: "text-rose-400" },
  ];

  const statusLabels: Record<string, string> = { pending: "معلق", processing: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغي" };
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/60", processing: "bg-blue-500/60", completed: "bg-emerald-500/60", cancelled: "bg-red-500/60",
  };

  const langColors: Record<string, string> = { "عربي": "hsl(var(--primary))", "أجنبي": "#f59e0b" };

  return (
    <div className="space-y-6 relative" dir="rtl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20 shadow-glow">
            <BarChart3 className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">تحليلات المتجر</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              إحصائيات شاملة · كتب · رفع · تصنيفات
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={refreshing} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 25 }}
            className={`rounded-2xl border border-border/50 bg-gradient-to-br ${stat.gradient} backdrop-blur-xl p-4 text-center`}>
            <div className="w-10 h-10 rounded-xl bg-background/40 backdrop-blur flex items-center justify-center mx-auto mb-2 border border-border/30">
              <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
            </div>
            <p className="text-2xl font-black tabular-nums text-foreground"><AnimatedNumber value={stat.value} /></p>
            <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Row: Upload Trends + Language + Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Trends */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-2xl border border-border/50 bg-gradient-to-br from-background/80 to-secondary/20 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">اتجاهات الرفع</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> آخر 7 أيام</p>
            </div>
          </div>
          <MiniBarChart data={uploadTrends} color="hsl(200, 90%, 50%)" />
          <div className="mt-3 text-center">
            <p className="text-xs text-muted-foreground">
              المجموع: <span className="font-bold text-foreground">{uploadTrends.reduce((s, d) => s + d.value, 0)}</span> رفع ناجح
            </p>
          </div>
        </motion.div>

        {/* Language Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border/50 bg-gradient-to-br from-background/80 to-secondary/20 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">الكتب حسب اللغة</h3>
              <p className="text-xs text-muted-foreground">{Object.keys(languageStats).length} لغة</p>
            </div>
          </div>
          <div className="space-y-4">
            {Object.entries(languageStats).sort((a, b) => b[1] - a[1]).map(([lang, count]) => {
              const pct = stats.totalProducts > 0 ? (count / stats.totalProducts) * 100 : 0;
              return (
                <div key={lang}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold tabular-nums text-foreground">{count} <span className="text-muted-foreground font-normal">({pct.toFixed(0)}%)</span></span>
                    <span className="text-sm font-medium text-foreground">{lang}</span>
                  </div>
                  <div className="h-3 bg-secondary/50 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                      className="h-full rounded-full" style={{ background: langColors[lang] || "hsl(var(--primary))" }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(languageStats).length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">لا توجد بيانات بعد</p>
            )}
          </div>
        </motion.div>

        {/* Category Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-2xl border border-border/50 bg-gradient-to-br from-background/80 to-secondary/20 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">الكتب حسب التصنيف</h3>
              <p className="text-xs text-muted-foreground">{Object.keys(categoryStats).length} تصنيف</p>
            </div>
          </div>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
              const pct = stats.totalProducts > 0 ? (count / stats.totalProducts) * 100 : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-foreground w-24 truncate text-right">{cat}</span>
                  <div className="flex-1 h-2.5 bg-secondary/50 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                      className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary/40" />
                  </div>
                  <span className="text-[10px] font-bold tabular-nums text-foreground w-6 text-left">{count}</span>
                </div>
              );
            })}
            {Object.keys(categoryStats).length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">لا توجد بيانات بعد</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Row: Top Books + Orders by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Books */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-2xl border border-border/50 bg-gradient-to-br from-background/80 to-secondary/20 backdrop-blur-xl overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">أكبر الكتب (حسب عدد الصفحات)</h3>
              <p className="text-xs text-muted-foreground">أعلى 8 كتب</p>
            </div>
          </div>
          <div className="divide-y divide-border/30 max-h-80 overflow-y-auto">
            {topBooks.map((book, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/20 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-medium text-foreground truncate">{book.name}</p>
                  <p className="text-[10px] text-muted-foreground">{book.category}</p>
                </div>
                <div className="text-left flex-shrink-0">
                  <p className="text-xs font-bold text-foreground">{book.pageCount} صفحة</p>
                  <p className="text-[10px] text-muted-foreground">{book.price} د.م</p>
                </div>
              </div>
            ))}
            {topBooks.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">لا توجد كتب بعدد صفحات</div>
            )}
          </div>
        </motion.div>

        {/* Orders by Status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="rounded-2xl border border-border/50 bg-gradient-to-br from-background/80 to-secondary/20 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">الطلبات حسب الحالة</h3>
              <p className="text-xs text-muted-foreground">{stats.totalOrders} طلب</p>
            </div>
          </div>
          <div className="space-y-4">
            {Object.entries(ordersByStatus).map(([status, count]) => {
              const pct = stats.totalOrders > 0 ? (count / stats.totalOrders) * 100 : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold tabular-nums text-foreground">{count} <span className="text-muted-foreground font-normal">({pct.toFixed(0)}%)</span></span>
                    <span className="text-sm font-medium text-foreground">{statusLabels[status] || status}</span>
                  </div>
                  <div className="h-3 bg-secondary/50 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                      className={`h-full rounded-full ${statusColors[status] || "bg-primary/60"}`} />
                  </div>
                </div>
              );
            })}
            {Object.keys(ordersByStatus).length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">لا توجد بيانات بعد</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Orders */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="rounded-2xl border border-border/50 bg-gradient-to-br from-background/80 to-secondary/20 backdrop-blur-xl p-6">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" /> آخر الطلبات
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-right p-2">رقم الطلب</th>
                <th className="text-right p-2">المبلغ</th>
                <th className="text-right p-2">الحالة</th>
                <th className="text-right p-2">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="p-2 font-mono text-xs">{o.order_number}</td>
                  <td className="p-2 font-bold">{Number(o.amount).toFixed(2)} د.م</td>
                  <td className="p-2">
                    <Badge variant="outline" className="text-[10px]">{statusLabels[o.status] || o.status}</Badge>
                  </td>
                  <td className="p-2 text-muted-foreground text-xs">{new Date(o.created_at).toLocaleDateString("ar")}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr><td colSpan={4} className="text-center text-muted-foreground py-8">لا توجد طلبات بعد</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default VisitorAnalytics;
