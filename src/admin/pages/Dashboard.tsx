import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Package, DollarSign, Users, TrendingUp, TrendingDown,
  ShoppingCart, Star, ArrowUpRight, BookOpen, Eye,
  Upload, CheckCircle, XCircle, Clock, Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

/* ── Donut Chart ── */
const DonutChart = ({ active, total, label }: { active: number; total: number; label: string }) => {
  const pct = total > 0 ? (active / total) * 100 : 0;
  const r = 56;
  const c = 2 * Math.PI * r;
  const onS = (pct / 100) * c;

  return (
    <div className="relative">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <defs>
          <linearGradient id="donut-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth="12" opacity="0.5" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke="url(#donut-gradient)" strokeWidth="12"
          strokeDasharray={`${onS} ${c - onS}`}
          strokeDashoffset={c / 4}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
        <text x="70" y="64" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10" fontWeight="500">{label}</text>
        <text x="70" y="84" textAnchor="middle" fill="hsl(var(--primary))" fontSize="18" fontWeight="800">{Math.round(pct)}%</text>
      </svg>
    </div>
  );
};

/* ── Bar Chart ── */
const BarChartPro = ({ data, color }: { data: { label: string; value: number }[]; color: string }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  const bw = 32;
  const gap = 12;
  const h = 160;
  const cw = data.length * (bw + gap);

  return (
    <svg width="100%" height={h + 35} viewBox={`0 0 ${cw + 20} ${h + 35}`} className="w-full">
      <defs>
        <linearGradient id="bar-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const bh = (d.value / max) * h;
        const x = 10 + i * (bw + gap);
        return (
          <g key={i}>
            <rect x={x} y={h - bh} width={bw} height={bh} rx={6} fill="url(#bar-grad)" style={{ transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }} />
            <text x={x + bw / 2} y={h + 18} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9" fontWeight="500">{d.label}</text>
            {d.value > 0 && (
              <text x={x + bw / 2} y={h - bh - 6} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="8" fontWeight="600">{d.value}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

/* ── Stat Card (HN Driver style) ── */
const StatCard = ({ icon: Icon, label, value, color, isCurrency, index, trend }: {
  icon: any; label: string; value: string | number; color: string; isCurrency?: boolean; index: number; trend?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 24 }}
    className="group relative rounded-2xl p-5 transition-all duration-300 hover:shadow-glow cursor-default overflow-hidden"
    style={{
      background: 'linear-gradient(135deg, hsl(190 90% 50% / 0.08), hsl(190 90% 50% / 0.03))',
      border: '1px solid hsl(190 90% 50% / 0.25)',
      boxShadow: 'inset 0 1px 0 0 hsl(190 90% 50% / 0.06)',
    }}
  >
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: 'hsl(190 90% 50% / 0.1)',
            border: '1px solid hsl(190 90% 50% / 0.2)',
          }}
        >
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trend >= 0 ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-3xl font-extrabold text-foreground tracking-tight">
        {isCurrency ? `$${value}` : value}
      </p>
      <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
    </div>
  </motion.div>
);

/* ── Status Labels ── */
const statusConfig: Record<string, { label: string; class: string }> = {
  completed: { label: "مكتمل", class: "bg-green-400/10 text-green-400" },
  pending: { label: "معلق", class: "bg-yellow-400/10 text-yellow-400" },
  processing: { label: "قيد التنفيذ", class: "bg-blue-400/10 text-blue-400" },
  cancelled: { label: "ملغي", class: "bg-red-400/10 text-red-400" },
};

interface Order {
  id: string;
  order_number: string;
  amount: number;
  status: string;
  created_at: string;
  customers: { name: string } | null;
  products: { name: string } | null;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string | null;
  is_active: boolean | null;
}

interface RecentUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

/* ── Main Dashboard ── */
const AdminDashboard = () => {
  const [totalProducts, setTotalProducts] = useState(0);
  const [activeProducts, setActiveProducts] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [categoryStats, setCategoryStats] = useState<[string, number][]>([]);
  const [earningsRange, setEarningsRange] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalVisits, setTotalVisits] = useState(0);
  const [todayVisits, setTodayVisits] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  // System monitoring
  const [jobStats, setJobStats] = useState({ pending: 0, processing: 0, done: 0, error: 0, todayUploads: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [productsRes, customersRes, ordersRes, topProdsRes, jobsRes, visitorsRes, todayVisitorsRes, profilesRes] = await Promise.all([
        supabase.from("products").select("id, category, is_active", { count: "exact" }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, order_number, amount, status, created_at, customers(name), products(name)").order("created_at", { ascending: false }),
        supabase.from("products").select("id, name, category, price, image, is_active").limit(5),
        supabase.from("upload_jobs").select("id, status, created_at"),
        supabase.from("visitors").select("id", { count: "exact", head: true }),
        supabase.from("visitors").select("id", { count: "exact", head: true }).gte("visit_time", todayStart.toISOString()),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      const jobs = jobsRes.data || [];
      const todayUploads = jobs.filter(j => new Date(j.created_at) >= todayStart).length;
      setJobStats({
        pending: jobs.filter(j => j.status === "pending").length,
        processing: jobs.filter(j => j.status === "processing").length,
        done: jobs.filter(j => j.status === "done").length,
        error: jobs.filter(j => j.status === "error").length,
        todayUploads,
      });

      const prods = productsRes.data || [];
      setTotalProducts(productsRes.count || 0);
      setActiveProducts(prods.filter((p: any) => p.is_active).length);
      setTotalCustomers(customersRes.count || 0);

      const orders = (ordersRes.data || []) as unknown as Order[];
      setAllOrders(orders);
      setRecentOrders(orders.slice(0, 8));
      setTotalOrders(orders.length);
      setTotalRevenue(orders.reduce((s, o) => s + Number(o.amount), 0));

      setTopProducts(topProdsRes.data || []);

      const catMap: Record<string, number> = {};
      prods.forEach((p: any) => { catMap[p.category] = (catMap[p.category] || 0) + 1; });
      setCategoryStats(Object.entries(catMap).sort((a, b) => b[1] - a[1]));
      setLoading(false);
      setTotalVisits(visitorsRes.count || 0);
      setTodayVisits(todayVisitorsRes.count || 0);
      setTotalUsers(profilesRes.count || 0);
    };
    fetchData();
  }, []);

  const earningsChartData = useMemo(() => {
    if (earningsRange === "daily") {
      const today = new Date().toISOString().slice(0, 10);
      return [0, 4, 8, 12, 16, 20].map((hour) => ({
        label: `${hour}`.padStart(2, "0"),
        value: allOrders
          .filter((o) => o.created_at.startsWith(today) && o.status === "completed")
          .filter((o) => { const h = new Date(o.created_at).getHours(); return h >= hour && h < hour + 4; })
          .reduce((sum, o) => sum + Number(o.amount), 0),
      }));
    }
    if (earningsRange === "weekly") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().slice(0, 10);
        return {
          label: d.toLocaleDateString("ar-MA", { weekday: "short" }),
          value: allOrders.filter((o) => o.created_at.startsWith(key) && o.status === "completed").reduce((s, o) => s + Number(o.amount), 0),
        };
      });
    }
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      return {
        label: d.toLocaleDateString("ar-MA", { month: "short" }),
        value: allOrders.filter((o) => {
          const od = new Date(o.created_at);
          return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth() && o.status === "completed";
        }).reduce((s, o) => s + Number(o.amount), 0),
      };
    });
  }, [allOrders, earningsRange]);

  const statCards = [
    { icon: Package, label: "إجمالي المنتجات", value: totalProducts.toLocaleString(), color: "text-primary", trend: 12 },
    { icon: ShoppingCart, label: "إجمالي الطلبات", value: String(totalOrders), color: "text-blue-400", trend: 8 },
    { icon: DollarSign, label: "إجمالي الأرباح", value: totalRevenue.toFixed(2), color: "text-yellow-400", isCurrency: true, trend: 23 },
    { icon: Users, label: "المستخدمون", value: String(totalUsers), color: "text-purple-400", trend: 5 },
    { icon: Eye, label: "إجمالي الزيارات", value: String(totalVisits), color: "text-green-400" },
    { icon: Eye, label: "زيارات اليوم", value: String(todayVisits), color: "text-amber-400" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">📊 لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("ar-MA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-400/10 gap-1.5 py-1.5 px-3">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          متصل بقاعدة البيانات
        </Badge>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, i) => (
          <StatCard key={i} {...stat} index={i} />
        ))}
      </div>

      {/* System Monitor */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="rounded-2xl border border-border bg-card/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 gap-1">
            <Activity className="w-3 h-3" /> مراقبة حية
          </Badge>
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            مراقبة النظام
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 text-center">
            <BookOpen className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-black text-foreground">{totalProducts}</p>
            <p className="text-[11px] text-muted-foreground">إجمالي الكتب</p>
          </div>
          <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-4 text-center">
            <Upload className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-black text-foreground">{jobStats.todayUploads}</p>
            <p className="text-[11px] text-muted-foreground">رفع اليوم</p>
          </div>
          <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/10 p-4 text-center">
            <Clock className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-black text-foreground">{jobStats.pending}</p>
            <p className="text-[11px] text-muted-foreground">في الانتظار</p>
          </div>
          <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-4 text-center">
            <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-black text-foreground">{jobStats.error}</p>
            <p className="text-[11px] text-muted-foreground">فاشل</p>
          </div>
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-4 text-center">
            <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-black text-foreground">{jobStats.done}</p>
            <p className="text-[11px] text-muted-foreground">مكتمل</p>
          </div>
        </div>
      </motion.div>

      {/* Charts + Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Earnings Chart */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 glass-card rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
              {(["daily", "weekly", "monthly"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setEarningsRange(range)}
                  className={`text-xs px-4 py-1.5 rounded-lg transition-all duration-200 font-medium ${
                    earningsRange === range
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {range === "daily" ? "يومي" : range === "weekly" ? "أسبوعي" : "شهري"}
                </button>
              ))}
            </div>
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              تحليل الأرباح
            </h3>
          </div>
          <BarChartPro data={earningsChartData} color="hsl(var(--primary))" />
        </motion.div>

        {/* Category Donut + Stats */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="glass-card rounded-2xl p-6">
          <h3 className="font-bold text-foreground text-right mb-6 flex items-center justify-end gap-2">
            <Package className="w-4 h-4 text-primary" />
            حالة المنتجات
          </h3>
          <div className="flex items-center justify-center gap-8">
            <DonutChart active={activeProducts} total={totalProducts} label="نشط" />
            <div className="space-y-4 text-right">
              <div className="p-3 rounded-xl bg-green-400/5 border border-green-400/10">
                <p className="text-2xl font-extrabold text-foreground">{activeProducts}</p>
                <p className="text-xs text-green-400 font-medium">نشط</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <p className="text-2xl font-extrabold text-foreground">{totalProducts - activeProducts}</p>
                <p className="text-xs text-muted-foreground font-medium">غير نشط</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Orders + Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <Badge variant="outline" className="text-blue-400 border-blue-400/30 bg-blue-400/10">
              {recentOrders.length} طلب
            </Badge>
            <h3 className="font-bold text-foreground text-right flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              آخر الطلبات
            </h3>
          </div>
          <div className="divide-y divide-border/50 max-h-80 overflow-auto">
            {recentOrders.length === 0 && (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                  <ShoppingCart className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">لا توجد طلبات بعد</p>
              </div>
            )}
            {recentOrders.map((order, i) => {
              const st = statusConfig[order.status] || { label: order.status, class: "bg-secondary text-muted-foreground" };
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-3.5 flex items-center justify-between hover:bg-secondary/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${st.class}`}>{st.label}</span>
                    <span className="text-primary font-bold text-sm">${order.amount}</span>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-sm text-foreground font-medium group-hover:text-primary transition-colors">{order.customers?.name || "غير معروف"}</p>
                      <p className="text-xs text-muted-foreground">{order.products?.name || "منتج محذوف"}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {order.customers?.name?.[0] || "?"}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Categories */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="glass-card rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
              {categoryStats.length} تصنيف
            </Badge>
            <h3 className="font-bold text-foreground text-right flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              المنتجات حسب التصنيف
            </h3>
          </div>
          <div className="p-5 space-y-4">
            {categoryStats.map(([cat, count]) => {
              const pct = totalProducts > 0 ? Math.round((count / totalProducts) * 100) : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-foreground">{count} منتج</span>
                    <span className="text-sm text-muted-foreground font-medium">{cat}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                    />
                  </div>
                </div>
              );
            })}
            {categoryStats.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-muted-foreground text-sm">لا توجد تصنيفات بعد</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Top Products */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <button className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
            عرض الكل <ArrowUpRight className="w-3 h-3" />
          </button>
          <h3 className="font-bold text-foreground text-right flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            أفضل المنتجات
          </h3>
        </div>
        <div className="divide-y divide-border/50">
          {topProducts.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="p-3.5 flex items-center justify-between text-right hover:bg-secondary/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${p.is_active ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"}`}>
                  {p.is_active ? "نشط" : "متوقف"}
                </span>
                <span className="text-primary font-bold text-sm">${p.price}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">{p.category}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground truncate max-w-[200px] group-hover:text-primary transition-colors">{p.name}</span>
                <img src={p.image || ""} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-secondary" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
