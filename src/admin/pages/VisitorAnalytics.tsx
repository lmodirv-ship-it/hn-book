import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Eye, Users, TrendingUp, ShoppingCart, BarChart3, Package, DollarSign, Activity, RefreshCw } from "lucide-react";
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

const VisitorAnalytics = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0, activeProducts: 0, totalOrders: 0,
    pendingOrders: 0, completedOrders: 0, totalCustomers: 0, totalRevenue: 0,
  });
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<Record<string, number>>({});

  const fetchData = async () => {
    setRefreshing(true);
    const [productsRes, ordersRes, customersRes] = await Promise.all([
      supabase.from("products").select("*"),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("customers").select("*"),
    ]);

    const products = productsRes.data || [];
    const orders = ordersRes.data || [];
    const customers = customersRes.data || [];

    setStats({
      totalProducts: products.length,
      activeProducts: products.filter(p => p.is_active).length,
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === "pending").length,
      completedOrders: orders.filter(o => o.status === "completed").length,
      totalCustomers: customers.length,
      totalRevenue: orders.filter(o => o.status === "completed").reduce((s, o) => s + Number(o.amount), 0),
    });

    const cats: Record<string, number> = {};
    products.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
    setCategoryStats(cats);

    const statuses: Record<string, number> = {};
    orders.forEach(o => { statuses[o.status] = (statuses[o.status] || 0) + 1; });
    setOrdersByStatus(statuses);

    setRecentOrders(orders.slice(0, 10));
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, []);

  const statCards = [
    { icon: Package, label: "إجمالي المنتجات", value: stats.totalProducts, gradient: "from-primary/20 to-primary/5", iconColor: "text-primary" },
    { icon: ShoppingCart, label: "إجمالي الطلبات", value: stats.totalOrders, gradient: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-400" },
    { icon: Users, label: "العملاء", value: stats.totalCustomers, gradient: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-400" },
    { icon: DollarSign, label: "الإيرادات ($)", value: stats.totalRevenue, gradient: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-400" },
    { icon: Activity, label: "طلبات معلقة", value: stats.pendingOrders, gradient: "from-rose-500/20 to-rose-500/5", iconColor: "text-rose-400" },
    { icon: TrendingUp, label: "طلبات مكتملة", value: stats.completedOrders, gradient: "from-violet-500/20 to-violet-500/5", iconColor: "text-violet-400" },
  ];

  const statusLabels: Record<string, string> = { pending: "معلق", processing: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغي" };
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/60", processing: "bg-blue-500/60", completed: "bg-emerald-500/60", cancelled: "bg-red-500/60",
  };

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
              إحصائيات شاملة عن أداء المتجر
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
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
          <div className="space-y-3">
            {Object.entries(ordersByStatus).map(([status, count]) => {
              const pct = stats.totalOrders > 0 ? (count / stats.totalOrders) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-sm text-foreground w-24">{statusLabels[status] || status}</span>
                  <div className="flex-1 h-3 bg-secondary/50 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                      className={`h-full rounded-full ${statusColors[status] || "bg-primary/60"}`} />
                  </div>
                  <span className="text-xs font-bold tabular-nums text-foreground w-8 text-left">{count}</span>
                  <span className="text-[10px] text-muted-foreground w-10 text-left">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
            {Object.keys(ordersByStatus).length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">لا توجد بيانات بعد</p>
            )}
          </div>
        </motion.div>

        {/* Products by Category */}
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
          className="rounded-2xl border border-border/50 bg-gradient-to-br from-background/80 to-secondary/20 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">المنتجات حسب التصنيف</h3>
              <p className="text-xs text-muted-foreground">{Object.keys(categoryStats).length} تصنيف</p>
            </div>
          </div>
          <div className="space-y-3">
            {Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
              const pct = stats.totalProducts > 0 ? (count / stats.totalProducts) * 100 : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm text-foreground w-28 truncate">{cat}</span>
                  <div className="flex-1 h-3 bg-secondary/50 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                      className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary/40" />
                  </div>
                  <span className="text-xs font-bold tabular-nums text-foreground w-8 text-left">{count}</span>
                </div>
              );
            })}
            {Object.keys(categoryStats).length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">لا توجد بيانات بعد</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Orders */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
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
                  <td className="p-2 font-bold">${Number(o.amount).toFixed(2)}</td>
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
