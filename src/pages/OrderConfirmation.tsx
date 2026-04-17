import { useEffect, useState } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Package, ArrowLeft, BookOpen, Copy, Search, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import {
  communicationsService,
  applyTemplate,
  type WhatsAppConfig,
  type EmailConfig,
} from "@/services/communicationsService";

const OrderConfirmation = () => {
  const { id } = useParams();
  const location = useLocation();
  const order = (location.state as any)?.order;
  const pdfUrl = order?.pdfUrl || order?.pdf_url || "";

  const [wa, setWa] = useState<WhatsAppConfig | null>(null);
  const [em, setEm] = useState<EmailConfig | null>(null);

  useEffect(() => {
    communicationsService.getWhatsApp().then(setWa).catch(() => setWa(null));
    communicationsService.getEmail().then(setEm).catch(() => setEm(null));
  }, []);

  const vars = {
    orderNumber: order?.orderNumber ?? "-",
    totalAmount: order?.totalAmount ?? 0,
    pdfUrl: pdfUrl || "",
  };

  const copyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      toast.success("تم نسخ رقم الطلب");
    }
  };

  const waReady = !!(wa?.enabled && wa.phone_number);
  const emailReady = !!(em?.enabled && em.email_address);

  const sendWhatsApp = () => {
    if (!waReady || !wa) return;
    const msg = applyTemplate(wa.default_message || "", vars);
    const phone = wa.phone_number.replace(/[^\d]/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  const sendEmail = () => {
    if (!emailReady || !em) return;
    const subject = applyTemplate(em.subject_template || "", vars);
    const body = applyTemplate(em.body_template || "", vars);
    const url = `mailto:${em.email_address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
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
                <Button
                  onClick={sendWhatsApp}
                  disabled={!waReady}
                  className="w-full rounded-xl gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                  title={waReady ? "" : "الإعداد غير مفعّل"}
                >
                  <MessageCircle className="w-4 h-4" /> إرسال إلى المطبعة (واتساب)
                </Button>
                <Button
                  onClick={sendEmail}
                  disabled={!emailReady}
                  variant="secondary"
                  className="w-full rounded-xl gap-2 disabled:opacity-50"
                  title={emailReady ? "" : "الإعداد غير مفعّل"}
                >
                  <Mail className="w-4 h-4" /> إرسال بالبريد الإلكتروني
                </Button>
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
