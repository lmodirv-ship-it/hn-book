import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Clock, CheckCircle, Truck, XCircle, ArrowRight, ShoppingBag, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

const STATUS_MAP: Record<string, { icon: any; label: string; color: string; step: number }> = {
  pending: { icon: Clock, label: "قيد الانتظار", color: "text-yellow-500", step: 1 },
  processing: { icon: Package, label: "قيد المعالجة", color: "text-blue-500", step: 2 },
  completed: { icon: CheckCircle, label: "مكتمل", color: "text-green-500", step: 3 },
  cancelled: { icon: XCircle, label: "ملغي", color: "text-red-500", step: 0 },
};

const STEPS = [
  { key: "pending", label: "تم الطلب", icon: ShoppingBag },
  { key: "processing", label: "قيد التجهيز", icon: Package },
  { key: "completed", label: "مكتمل", icon: CheckCircle },
];

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  payment_method: string;
  shipping_name: string;
  shipping_country: string;
}

interface OrderItem {
  id: string;
  price: number;
  products: { name: string; image: string; category: string } | null;
}

const MyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const { data } = await supabase
        .from("orders")
        .select("id, order_number, total_amount, status, created_at, payment_method, shipping_name, shipping_country")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      setOrders((data || []) as Order[]);
      setLoading(false);
    };
    fetch();
  }, [navigate]);

  const toggleOrder = async (orderId: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      return;
    }
    setExpandedOrder(orderId);
    if (!orderItems[orderId]) {
      const { data } = await supabase
        .from("order_items")
        .select("id, price, products(name, image, category)")
        .eq("order_id", orderId);
      setOrderItems((prev) => ({ ...prev, [orderId]: (data || []) as unknown as OrderItem[] }));
    }
  };

  const currentStep = (status: string) => STATUS_MAP[status]?.step ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen noise-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen noise-bg" dir="rtl">
      <div className="relative z-10 pt-14">
        <Navbar categories={[]} activeCategory="" onCategorySelect={() => {}} productCounts={{}} />

        <section className="py-10 sm:py-14">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-foreground">طلباتي</h1>
                  <p className="text-xs text-muted-foreground">{orders.length} طلب</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
                <Link to="/profile"><ArrowRight className="w-3.5 h-3.5" /> الملف الشخصي</Link>
              </Button>
            </motion.div>

            {orders.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 space-y-4">
                <div className="w-20 h-20 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-9 h-9 text-muted-foreground/40" />
                </div>
                <h2 className="text-lg font-bold text-foreground">لا توجد طلبات</h2>
                <p className="text-sm text-muted-foreground">لم تقم بأي طلب بعد</p>
                <Button asChild className="rounded-xl"><Link to="/books">تصفح الكتب</Link></Button>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {orders.map((order, i) => {
                    const sc = STATUS_MAP[order.status] || STATUS_MAP.pending;
                    const Icon = sc.icon;
                    const isExpanded = expandedOrder === order.id;
                    const step = currentStep(order.status);
                    const isCancelled = order.status === "cancelled";

                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden"
                      >
                        <button
                          onClick={() => toggleOrder(order.id)}
                          className="w-full p-4 flex items-center gap-4 hover:bg-secondary/10 transition-colors text-right"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sc.color} bg-current/10`}
                            style={{ backgroundColor: `color-mix(in srgb, currentColor 10%, transparent)` }}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground font-mono">{order.order_number}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString("ar-MA", { year: "numeric", month: "long", day: "numeric" })}
                            </p>
                          </div>
                          <div className="text-left flex-shrink-0">
                            <p className="text-sm font-bold text-foreground">{order.total_amount} د.م</p>
                            <p className={`text-[10px] font-semibold ${sc.color}`}>{sc.label}</p>
                          </div>
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
                              <div className="px-4 pb-4 space-y-4">
                                <Separator className="bg-border/20" />

                                {/* Status Timeline */}
                                {!isCancelled && (
                                  <div className="flex items-center justify-between px-4">
                                    {STEPS.map((s, idx) => {
                                      const StepIcon = s.icon;
                                      const isActive = step >= idx + 1;
                                      return (
                                        <div key={s.key} className="flex flex-col items-center gap-1 relative">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isActive ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}>
                                            <StepIcon className="w-4 h-4" />
                                          </div>
                                          <span className={`text-[10px] ${isActive ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{s.label}</span>
                                          {idx < STEPS.length - 1 && (
                                            <div className={`absolute top-4 -left-8 w-16 h-0.5 ${step > idx + 1 ? "bg-primary" : "bg-muted/30"}`} style={{ transform: "translateX(-50%)" }} />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {isCancelled && (
                                  <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3 text-center">
                                    <p className="text-xs text-red-500 font-semibold">تم إلغاء هذا الطلب</p>
                                  </div>
                                )}

                                {/* Order Items */}
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-muted-foreground">الكتب</p>
                                  {!orderItems[order.id] ? (
                                    <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                                  ) : (
                                    orderItems[order.id].map((item) => (
                                      <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-background/30">
                                        <img src={item.products?.image || "/placeholder.svg"} alt="" className="w-10 h-12 rounded object-cover border border-border/20" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-foreground truncate">{item.products?.name || "—"}</p>
                                          <p className="text-[10px] text-muted-foreground">{item.products?.category}</p>
                                        </div>
                                        <p className="text-xs font-bold text-foreground">{item.price} د.م</p>
                                      </div>
                                    ))
                                  )}
                                </div>

                                {/* Details */}
                                <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                                  <div>طريقة الدفع: <span className="text-foreground font-medium">{order.payment_method === "cod" ? "عند الاستلام" : "تحويل بنكي"}</span></div>
                                  <div>البلد: <span className="text-foreground font-medium">{order.shipping_country}</span></div>
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
            )}
          </div>
        </section>
        <Footer />
      </div>
    </div>
  );
};

export default MyOrders;
