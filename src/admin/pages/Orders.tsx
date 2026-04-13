import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Order {
  id: string;
  order_number: string;
  amount: number;
  status: string;
  created_at: string;
  customers: { name: string } | null;
  products: { name: string } | null;
}

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  completed: { icon: CheckCircle, color: "text-green-400 bg-green-400/10", label: "مكتمل" },
  pending: { icon: AlertCircle, color: "text-yellow-400 bg-yellow-400/10", label: "معلق" },
  processing: { icon: Clock, color: "text-blue-400 bg-blue-400/10", label: "قيد التنفيذ" },
  cancelled: { icon: AlertCircle, color: "text-red-400 bg-red-400/10", label: "ملغي" },
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, amount, status, created_at, customers(name), products(name)")
        .order("created_at", { ascending: false });
      setOrders((data || []) as unknown as Order[]);
      setLoading(false);
    };
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusCounts = {
    completed: orders.filter(o => o.status === "completed").length,
    pending: orders.filter(o => o.status === "pending").length,
    processing: orders.filter(o => o.status === "processing").length,
  };

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground">🛒 إدارة الطلبات</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{orders.length} طلب</p>
      </motion.div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "مكتمل", count: statusCounts.completed, color: "text-green-400" },
          { label: "معلق", count: statusCounts.pending, color: "text-yellow-400" },
          { label: "قيد التنفيذ", count: statusCounts.processing, color: "text-blue-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">رقم الطلب</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">العميل</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">المنتج</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">المبلغ</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">التاريخ</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const sc = statusConfig[order.status] || statusConfig.pending;
                const Icon = sc.icon;
                return (
                  <tr key={order.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-primary">{order.order_number}</td>
                    <td className="py-3 px-4 font-medium text-foreground">{order.customers?.name || "غير معروف"}</td>
                    <td className="py-3 px-4 text-muted-foreground truncate max-w-[200px]">{order.products?.name || "-"}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">${order.amount}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{new Date(order.created_at).toLocaleDateString("ar-MA")}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${sc.color}`}>
                        <Icon className="w-3 h-3" />
                        {sc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminOrders;
