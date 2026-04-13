import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, DollarSign, Users, TrendingUp, ShoppingCart, Eye, Star, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StatCardProps {
  icon: any;
  label: string;
  value: string;
  change: string;
  changePositive: boolean;
  index: number;
}

const StatCard = ({ icon: Icon, label, value, change, changePositive, index }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 24 }}
    className="group relative rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-lg cursor-default overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-secondary/50">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
          changePositive ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
        }`}>
          <TrendingUp className={`w-3 h-3 ${!changePositive ? "rotate-180" : ""}`} />
          {change}
        </div>
      </div>
      <p className="text-3xl font-extrabold text-foreground tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
    </div>
  </motion.div>
);

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
}

const statusLabels: Record<string, string> = {
  completed: "مكتمل",
  pending: "معلق",
  processing: "قيد التنفيذ",
  cancelled: "ملغي",
};

const AdminDashboard = () => {
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [categoryStats, setCategoryStats] = useState<[string, number][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [productsRes, customersRes, ordersRes, topProdsRes] = await Promise.all([
        supabase.from("products").select("id, category", { count: "exact" }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, order_number, amount, status, created_at, customers(name), products(name)").order("created_at", { ascending: false }).limit(8),
        supabase.from("products").select("id, name, category, price, image").limit(5),
      ]);

      const prods = productsRes.data || [];
      setTotalProducts(productsRes.count || 0);
      setTotalCustomers(customersRes.count || 0);

      const orders = (ordersRes.data || []) as unknown as Order[];
      setRecentOrders(orders);
      setTotalOrders(orders.length);
      setTotalRevenue(orders.reduce((s, o) => s + Number(o.amount), 0));

      setTopProducts(topProdsRes.data || []);

      // Category stats
      const catMap: Record<string, number> = {};
      prods.forEach((p: any) => {
        catMap[p.category] = (catMap[p.category] || 0) + 1;
      });
      setCategoryStats(Object.entries(catMap).sort((a, b) => b[1] - a[1]));
      setLoading(false);
    };

    fetchData();
  }, []);

  const stats = [
    { icon: Package, label: "إجمالي المنتجات", value: totalProducts.toLocaleString(), change: "+12%", changePositive: true },
    { icon: ShoppingCart, label: "إجمالي الطلبات", value: String(totalOrders), change: "+8%", changePositive: true },
    { icon: DollarSign, label: "إجمالي الأرباح", value: `$${totalRevenue.toFixed(2)}`, change: "+23%", changePositive: true },
    { icon: Users, label: "العملاء", value: String(totalCustomers), change: "+5%", changePositive: true },
    { icon: Eye, label: "الزيارات اليوم", value: "3,842", change: "+18%", changePositive: true },
    { icon: Star, label: "التقييم العام", value: "4.8", change: "+0.2", changePositive: true },
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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">📊 لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("ar-MA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-green-400/30 bg-green-400/10 text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          متصل بقاعدة البيانات
        </span>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} index={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-1 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            المنتجات حسب التصنيف
          </h3>
          <div className="space-y-3">
            {categoryStats.map(([cat, count]) => {
              const pct = totalProducts > 0 ? Math.round((count / totalProducts) * 100) : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{cat}</span>
                    <span className="text-xs font-semibold text-foreground">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
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
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              آخر الطلبات
            </h3>
          </div>
          <div className="space-y-0">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {order.customers?.name?.[0] || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{order.customers?.name || "غير معروف"}</p>
                    <p className="text-xs text-muted-foreground">{order.products?.name || "منتج محذوف"}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">${order.amount}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    order.status === "completed" ? "bg-green-400/10 text-green-400" :
                    order.status === "pending" ? "bg-yellow-400/10 text-yellow-400" :
                    "bg-blue-400/10 text-blue-400"
                  }`}>{statusLabels[order.status] || order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-primary" />
          أفضل المنتجات
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right py-3 px-2 text-xs text-muted-foreground font-medium">المنتج</th>
                <th className="text-right py-3 px-2 text-xs text-muted-foreground font-medium">التصنيف</th>
                <th className="text-right py-3 px-2 text-xs text-muted-foreground font-medium">السعر</th>
                <th className="text-right py-3 px-2 text-xs text-muted-foreground font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p) => (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <img src={p.image || ""} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                      <span className="font-medium text-foreground truncate max-w-[200px]">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">{p.category}</span>
                  </td>
                  <td className="py-3 px-2 font-semibold text-foreground">${p.price}</td>
                  <td className="py-3 px-2">
                    <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-green-400/10 text-green-400">نشط</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
