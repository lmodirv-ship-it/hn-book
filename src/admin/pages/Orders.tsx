import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Clock, CheckCircle, AlertCircle, Package, ChevronDown, ChevronUp, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  amount: number;
  status: string;
  created_at: string;
  shipping_name: string | null;
  shipping_email: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_country: string | null;
  payment_method: string | null;
  user_id: string | null;
}

interface OrderItem {
  id: string;
  price: number;
  products: { name: string; image: string } | null;
}

const statusConfig: Record<string, { icon: any; color: string; label: string; bg: string }> = {
  completed: { icon: CheckCircle, color: "text-green-400", label: "مكتمل", bg: "bg-green-400/10" },
  pending: { icon: AlertCircle, color: "text-yellow-400", label: "معلق", bg: "bg-yellow-400/10" },
  processing: { icon: Clock, color: "text-blue-400", label: "قيد التنفيذ", bg: "bg-blue-400/10" },
  cancelled: { icon: AlertCircle, color: "text-red-400", label: "ملغي", bg: "bg-red-400/10" },
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, total_amount, amount, status, created_at, shipping_name, shipping_email, shipping_phone, shipping_address, shipping_country, payment_method, user_id")
      .order("created_at", { ascending: false });
    setOrders((data || []) as Order[]);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const toggleOrder = async (orderId: string) => {
    if (expandedOrder === orderId) { setExpandedOrder(null); return; }
    setExpandedOrder(orderId);
    if (!orderItems[orderId]) {
      const { data } = await supabase
        .from("order_items")
        .select("id, price, products(name, image)")
        .eq("order_id", orderId);
      setOrderItems((prev) => ({ ...prev, [orderId]: (data || []) as unknown as OrderItem[] }));
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus as any })
      .eq("id", orderId);

    if (error) {
      toast.error("فشل تحديث الحالة");
    } else {
      toast.success("تم تحديث حالة الطلب");
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    }
    setUpdatingStatus(null);
  };

  const filtered = orders.filter((o) => {
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (search && !o.order_number.toLowerCase().includes(search.toLowerCase()) && !o.shipping_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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

      {/* Stats */}
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

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث برقم الطلب أو اسم العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 rounded-xl bg-background/50"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="pending">معلق</SelectItem>
            <SelectItem value="processing">قيد التنفيذ</SelectItem>
            <SelectItem value="completed">مكتمل</SelectItem>
            <SelectItem value="cancelled">ملغي</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">لا توجد طلبات</div>
        )}
        <AnimatePresence>
          {filtered.map((order) => {
            const sc = statusConfig[order.status] || statusConfig.pending;
            const Icon = sc.icon;
            const isExpanded = expandedOrder === order.id;
            const displayAmount = order.total_amount || order.amount;

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-card overflow-hidden"
              >
                <button
                  onClick={() => toggleOrder(order.id)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-secondary/10 transition-colors text-right"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${sc.color} ${sc.bg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-bold text-primary">{order.order_number}</p>
                    <p className="text-[10px] text-muted-foreground">{order.shipping_name || "—"}</p>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <p className="text-sm font-bold text-foreground">{displayAmount} د.م</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("ar-MA")}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.color} ${sc.bg}`}>{sc.label}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4">
                        {/* Customer details */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                          <div><span className="text-muted-foreground">الاسم:</span> <span className="text-foreground font-medium">{order.shipping_name || "—"}</span></div>
                          <div><span className="text-muted-foreground">الهاتف:</span> <span className="text-foreground font-medium" dir="ltr">{order.shipping_phone || "—"}</span></div>
                          <div><span className="text-muted-foreground">البريد:</span> <span className="text-foreground font-medium" dir="ltr">{order.shipping_email || "—"}</span></div>
                          <div><span className="text-muted-foreground">البلد:</span> <span className="text-foreground font-medium">{order.shipping_country || "—"}</span></div>
                          <div className="col-span-2"><span className="text-muted-foreground">العنوان:</span> <span className="text-foreground font-medium">{order.shipping_address || "—"}</span></div>
                          <div><span className="text-muted-foreground">الدفع:</span> <span className="text-foreground font-medium">{order.payment_method === "cod" ? "عند الاستلام" : order.payment_method === "transfer" ? "تحويل بنكي" : order.payment_method}</span></div>
                        </div>

                        {/* Items */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">المنتجات</p>
                          {!orderItems[order.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
                          ) : orderItems[order.id].length === 0 ? (
                            <p className="text-xs text-muted-foreground">لا توجد عناصر</p>
                          ) : (
                            orderItems[order.id].map((item) => (
                              <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20">
                                <img src={item.products?.image || "/placeholder.svg"} alt="" className="w-8 h-10 rounded object-cover" />
                                <span className="text-xs text-foreground flex-1 truncate">{item.products?.name || "—"}</span>
                                <span className="text-xs font-bold text-foreground">{item.price} د.م</span>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Status update */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">تغيير الحالة:</span>
                          <div className="flex gap-2 flex-wrap">
                            {(["pending", "processing", "completed", "cancelled"] as const).map((s) => (
                              <Button
                                key={s}
                                size="sm"
                                variant={order.status === s ? "default" : "outline"}
                                className="text-[10px] h-7 rounded-lg px-3"
                                disabled={order.status === s || updatingStatus === order.id}
                                onClick={() => updateStatus(order.id, s)}
                              >
                                {updatingStatus === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : statusConfig[s].label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminOrders;
