import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Package, Clock, CheckCircle2, XCircle, Loader2, Truck, PackageCheck, MapPin, Cog } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { db } from "@/api/client";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Printer, FileText } from "lucide-react";

const STATUS_FLOW = ["pending", "processing", "printing", "shipped", "delivered"] as const;

const STATUS_INFO: Record<string, { label: string; color: string; icon: any; progress: number }> = {
  pending:    { label: "قيد الانتظار", color: "text-yellow-500",  icon: Clock,        progress: 15 },
  processing: { label: "قيد المعالجة", color: "text-blue-500",    icon: Cog,          progress: 35 },
  printing:   { label: "جاري الطباعة", color: "text-purple-500",  icon: Printer,      progress: 60 },
  shipped:    { label: "تم الشحن",      color: "text-cyan-500",    icon: Truck,        progress: 85 },
  delivered:  { label: "تم التسليم",    color: "text-emerald-500", icon: PackageCheck, progress: 100 },
  completed:  { label: "مكتمل",          color: "text-emerald-500", icon: CheckCircle2, progress: 100 },
  cancelled:  { label: "ملغي",          color: "text-red-500",     icon: XCircle,      progress: 0 },
};

export default function TrackOrder() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get("code") || "");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  const lookup = async (orderCode: string) => {
    if (!orderCode.trim()) {
      toast.error("أدخل رقم الطلب");
      return;
    }
    setLoading(true);
    setNotFound(false);
    setOrder(null);

    // Try print orders first (ORD-xxxxxx codes)
    const code = orderCode.trim();
    const { data: printOrder } = await supabase
      .from("print_orders")
      .select("*")
      .eq("order_code", code)
      .maybeSingle();
    if (printOrder) {
      setLoading(false);
      setOrder({ ...printOrder, _kind: "print" });
      return;
    }

    // Fallback: book/product orders by order_number
    const { data, error } = await db
      .from("orders")
      .select("*")
      .eq("order_number", code)
      .maybeSingle();
    setLoading(false);
    if (error || !data) {
      setNotFound(true);
      return;
    }
    setOrder({ ...data, _kind: "book" });
  };

  useEffect(() => {
    const initial = params.get("code");
    if (initial) lookup(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const info = order ? STATUS_INFO[order.status] || STATUS_INFO.pending : null;
  const Icon = info?.icon || Package;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">تتبع طلبك</h1>
          <p className="text-muted-foreground">أدخل رقم الطلب لمعرفة حالته</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup(code);
          }}
          className="flex gap-2 mb-8"
        >
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="HN-XXXXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="pr-9 h-12 text-base"
              maxLength={50}
            />
          </div>
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تتبع"}
          </Button>
        </form>

        {notFound && (
          <div className="rounded-2xl border border-border bg-card/60 p-8 text-center">
            <XCircle className="w-12 h-12 mx-auto mb-3 text-red-500/70" />
            <p className="text-lg font-semibold text-foreground">لم يتم العثور على الطلب</p>
            <p className="text-sm text-muted-foreground mt-1">تأكد من رقم الطلب وحاول مجدداً</p>
          </div>
        )}

        {order && info && (
          <div className="rounded-2xl border border-border bg-card/60 p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl bg-card flex items-center justify-center ${info.color}`}>
                <Icon className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">رقم الطلب</p>
                <p className="font-bold text-foreground text-lg font-mono">
                  {order._kind === "print" ? order.order_code : order.order_number}
                </p>
                {order._kind === "print" && (
                  <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                    <Printer className="w-3 h-3" /> طلب طباعة
                  </p>
                )}
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">الحالة</p>
                <p className={`font-semibold ${info.color}`}>{info.label}</p>
              </div>
            </div>

            {order.status !== "cancelled" && (
              <div>
                <Progress value={info.progress} className="h-2" />
                <div className="flex justify-between mt-3 text-xs">
                  {STATUS_FLOW.map((s) => {
                    const reached =
                      STATUS_FLOW.indexOf(s) <=
                      STATUS_FLOW.indexOf(order.status as any);
                    return (
                      <span
                        key={s}
                        className={reached ? "text-primary font-medium" : "text-muted-foreground"}
                      >
                        {STATUS_INFO[s].label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {order._kind === "print" ? (
              <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-border">
                <div>
                  <p className="text-muted-foreground">العميل</p>
                  <p className="font-medium text-foreground">{order.customer_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">الهاتف</p>
                  <p className="font-medium text-foreground">{order.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">الكمية</p>
                  <p className="font-medium text-foreground">{order.quantity} بطاقة</p>
                </div>
                <div>
                  <p className="text-muted-foreground">المقاس</p>
                  <p className="font-medium text-foreground">{order.paper_size}</p>
                </div>
                {Number(order.total_price) > 0 && (
                  <div className="col-span-2 rounded-lg border-2 border-primary/30 bg-primary/5 p-3 flex justify-between items-baseline">
                    <span className="font-bold text-foreground">المبلغ الإجمالي</span>
                    <span className="text-xl font-bold text-primary">{order.total_price} <span className="text-xs">د.م</span></span>
                  </div>
                )}
                {order.pdf_url && (
                  <div className="col-span-2">
                    <a
                      href={order.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm"
                    >
                      <FileText className="w-4 h-4" /> تحميل ملف PDF الجاهز للطباعة
                    </a>
                  </div>
                )}

                {/* Shipping address */}
                {order.address && order.address !== "—" && (
                  <div className="col-span-2 rounded-lg border border-border bg-muted/20 p-3 mt-1">
                    <p className="text-muted-foreground flex items-center gap-1.5 mb-2 text-xs">
                      <MapPin className="w-3.5 h-3.5" /> عنوان التوصيل
                    </p>
                    <p className="font-medium text-foreground text-sm">{order.address}</p>
                    {order.city && <p className="text-xs text-muted-foreground mt-0.5">{order.city}</p>}
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="text-muted-foreground">
                        {order.delivery_option === "express" ? "🚀 توصيل سريع" : "🚚 توصيل عادي"}
                      </span>
                      {Number(order.shipping_fee) > 0 && (
                        <span className="font-bold text-primary">+{order.shipping_fee} د.م</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Tracking info — visible once shipped */}
                {(order.tracking_carrier || order.tracking_number || order.tracking_note || order.shipped_at) && (
                  <div className="col-span-2 rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3">
                    <p className="text-cyan-600 flex items-center gap-1.5 mb-2 text-xs font-semibold">
                      <Truck className="w-3.5 h-3.5" /> معلومات الشحن
                    </p>
                    {order.tracking_carrier && (
                      <p className="text-sm"><span className="text-muted-foreground">الشركة: </span><span className="font-medium text-foreground">{order.tracking_carrier}</span></p>
                    )}
                    {order.tracking_number && (
                      <p className="text-sm"><span className="text-muted-foreground">رقم التتبع: </span><span className="font-mono font-medium text-foreground" dir="ltr">{order.tracking_number}</span></p>
                    )}
                    {order.tracking_note && (
                      <p className="text-sm mt-1 text-foreground">{order.tracking_note}</p>
                    )}
                    {order.shipped_at && (
                      <p className="text-[11px] text-muted-foreground mt-1">شُحن: {new Date(order.shipped_at).toLocaleString("ar")}</p>
                    )}
                    {order.delivered_at && (
                      <p className="text-[11px] text-emerald-500 mt-0.5">سُلِّم: {new Date(order.delivered_at).toLocaleString("ar")}</p>
                    )}
                  </div>
                )}

                <div className="col-span-2">
                  <p className="text-muted-foreground">تاريخ الطلب</p>
                  <p className="font-medium text-foreground">
                    {new Date(order.created_at).toLocaleString("ar")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-border">
                <div>
                  <p className="text-muted-foreground">المبلغ الإجمالي</p>
                  <p className="font-bold text-primary text-lg">
                    {Number(order.total_amount || order.amount)} د.م
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">طريقة الدفع</p>
                  <p className="font-medium text-foreground">
                    {order.payment_method === "cod" ? "الدفع عند الاستلام" : order.payment_method}
                  </p>
                </div>
                {order.shipping_name && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">المستلم</p>
                    <p className="font-medium text-foreground">{order.shipping_name}</p>
                  </div>
                )}
                {order.shipping_address && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">العنوان</p>
                    <p className="font-medium text-foreground">{order.shipping_address}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-muted-foreground">تاريخ الطلب</p>
                  <p className="font-medium text-foreground">
                    {new Date(order.created_at).toLocaleString("ar")}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
