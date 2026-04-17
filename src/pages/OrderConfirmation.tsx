import { useLocation, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Package, ArrowLeft, BookOpen, Copy, Search, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";

const OrderConfirmation = () => {
  const { id } = useParams();
  const location = useLocation();
  const order = (location.state as any)?.order;

  const copyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      toast.success("تم نسخ رقم الطلب");
    }
  };

  return (
    <div className="relative min-h-screen noise-bg" dir="rtl">
      <div className="relative z-10 pt-14">
        <Navbar categories={[]} activeCategory="" onCategorySelect={() => {}} productCounts={{}} />

        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4 max-w-lg">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-8 text-center space-y-6"
            >
              {/* Success icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2, stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto"
              >
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </motion.div>

              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold text-foreground">تم تأكيد الطلب! 🎉</h1>
                <p className="text-sm text-muted-foreground">شكراً لك! تم إنشاء طلبك بنجاح</p>
              </div>

              {order && (
                <>
                  <div className="rounded-xl bg-background/50 border border-border/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">رقم الطلب</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-mono font-bold text-foreground">{order.orderNumber}</span>
                        <button onClick={copyOrderNumber} className="p-1 rounded hover:bg-muted/20 transition-colors">
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <Separator className="bg-border/10" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">المبلغ الإجمالي</span>
                      <span className="text-lg font-bold text-primary">{order.totalAmount} د.م</span>
                    </div>
                    <Separator className="bg-border/10" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">الحالة</span>
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-xs font-semibold text-yellow-500">قيد المعالجة</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    سيتم معالجة طلبك قريباً. بعد تأكيد الدفع ستتمكن من قراءة وتحميل الكتب.
                  </p>
                </>
              )}

              <div className="flex flex-col gap-2 pt-2">
                {order?.orderNumber && (
                  <Button asChild variant="secondary" className="w-full rounded-xl gap-2">
                    <Link to={`/track-order?code=${encodeURIComponent(order.orderNumber)}`}>
                      <Search className="w-4 h-4" /> تتبع الطلب
                    </Link>
                  </Button>
                )}
                <Button asChild className="w-full rounded-xl gap-2">
                  <Link to="/books">
                    <BookOpen className="w-4 h-4" /> متابعة التسوق
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full rounded-xl gap-2">
                  <Link to="/profile">
                    <ArrowLeft className="w-4 h-4" /> طلباتي
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
        <Footer />
      </div>
    </div>
  );
};

export default OrderConfirmation;
