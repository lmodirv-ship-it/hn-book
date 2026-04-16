import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, Truck, User, Mail, Phone, MapPin, Globe, ArrowLeft, ShoppingCart, Loader2, Shield, Ticket, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { orderService } from "@/services/orderService";
import { couponService, type CouponValidation } from "@/services/couponService";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const COUNTRIES = [
  { value: "MA", label: "المغرب 🇲🇦" },
  { value: "DZ", label: "الجزائر 🇩🇿" },
  { value: "TN", label: "تونس 🇹🇳" },
  { value: "EG", label: "مصر 🇪🇬" },
  { value: "SA", label: "السعودية 🇸🇦" },
  { value: "AE", label: "الإمارات 🇦🇪" },
  { value: "FR", label: "فرنسا 🇫🇷" },
  { value: "OTHER", label: "أخرى" },
];

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart, itemCount } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponValidation | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    country: "MA",
    paymentMethod: "cod",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const discountAmount = couponResult?.isValid ? couponResult.discountAmount : 0;
  const finalTotal = Math.max(0, totalPrice - discountAmount);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    const result = await couponService.validate(couponCode, totalPrice);
    setValidatingCoupon(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setCouponResult(result.data!);
    if (result.data!.isValid) {
      toast.success(result.data!.message);
    } else {
      toast.error(result.data!.message);
    }
  };

  const removeCoupon = () => {
    setCouponCode("");
    setCouponResult(null);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 3) e.name = "الاسم مطلوب (3 أحرف على الأقل)";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "بريد إلكتروني غير صالح";
    if (!form.phone.trim() || form.phone.trim().length < 8) e.phone = "رقم الهاتف مطلوب";
    if (!form.address.trim() || form.address.trim().length < 5) e.address = "العنوان مطلوب";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (items.length === 0) {
      toast.error("السلة فارغة");
      return;
    }

    // Check auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast.error("يجب تسجيل الدخول أولاً");
      navigate("/auth");
      return;
    }

    setSubmitting(true);
    const result = await orderService.createOrder({
      items: items.map((i) => ({ bookId: i.bookId, price: i.price })),
      totalAmount: finalTotal,
      shippingName: form.name.trim(),
      shippingEmail: form.email.trim(),
      shippingPhone: form.phone.trim(),
      shippingAddress: form.address.trim(),
      shippingCountry: form.country,
      paymentMethod: form.paymentMethod,
    });
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    // Increment coupon usage
    if (couponResult?.isValid) {
      await couponService.incrementUsage(couponResult.code);
    }

    clearCart();
    toast.success("تم إنشاء الطلب بنجاح!");
    navigate(`/order-confirmation/${result.data!.id}`, {
      state: { order: result.data },
    });
  };

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  if (items.length === 0) {
    return (
      <div className="relative min-h-screen noise-bg" dir="rtl">
        <div className="relative z-10 pt-14">
          <Navbar categories={[]} activeCategory="" onCategorySelect={() => {}} productCounts={{}} />
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">السلة فارغة</p>
            <Button asChild className="rounded-xl">
              <Link to="/books">تصفح الكتب</Link>
            </Button>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen noise-bg" dir="rtl">
      <div className="relative z-10 pt-14">
        <Navbar categories={[]} activeCategory="" onCategorySelect={() => {}} productCounts={{}} />

        <section className="py-10 sm:py-14">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                إتمام الطلب
              </h1>
            </motion.div>

            <form onSubmit={handleSubmit}>
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Form */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="lg:col-span-2 space-y-6"
                >
                  {/* Shipping info */}
                  <div className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-5 space-y-4">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" /> معلومات الشحن
                    </h3>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1"><User className="w-3 h-3" /> الاسم الكامل</Label>
                        <Input
                          value={form.name}
                          onChange={(e) => setField("name", e.target.value)}
                          placeholder="محمد أمين"
                          className={`rounded-xl bg-background/50 ${errors.name ? "border-destructive" : "border-border/20"}`}
                        />
                        {errors.name && <p className="text-[10px] text-destructive">{errors.name}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> البريد الإلكتروني</Label>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => setField("email", e.target.value)}
                          placeholder="email@example.com"
                          className={`rounded-xl bg-background/50 ${errors.email ? "border-destructive" : "border-border/20"}`}
                        />
                        {errors.email && <p className="text-[10px] text-destructive">{errors.email}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> الهاتف</Label>
                        <Input
                          value={form.phone}
                          onChange={(e) => setField("phone", e.target.value)}
                          placeholder="+212 6XX XXX XXX"
                          className={`rounded-xl bg-background/50 ${errors.phone ? "border-destructive" : "border-border/20"}`}
                        />
                        {errors.phone && <p className="text-[10px] text-destructive">{errors.phone}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1"><Globe className="w-3 h-3" /> البلد</Label>
                        <Select value={form.country} onValueChange={(v) => setField("country", v)}>
                          <SelectTrigger className="rounded-xl bg-background/50 border-border/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> العنوان</Label>
                      <Input
                        value={form.address}
                        onChange={(e) => setField("address", e.target.value)}
                        placeholder="المدينة، الحي، الشارع..."
                        className={`rounded-xl bg-background/50 ${errors.address ? "border-destructive" : "border-border/20"}`}
                      />
                      {errors.address && <p className="text-[10px] text-destructive">{errors.address}</p>}
                    </div>
                  </div>

                  {/* Payment method */}
                  <div className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-5 space-y-4">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" /> طريقة الدفع
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        { value: "cod", label: "الدفع عند الاستلام", icon: "💵", desc: "ادفع نقداً عند التوصيل" },
                        { value: "transfer", label: "تحويل بنكي", icon: "🏦", desc: "تحويل إلى حسابنا البنكي" },
                      ].map((method) => (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => setField("paymentMethod", method.value)}
                          className={`p-4 rounded-xl border text-right transition-all ${
                            form.paymentMethod === method.value
                              ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                              : "border-border/20 bg-background/30 hover:border-border/40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{method.icon}</span>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{method.label}</p>
                              <p className="text-[10px] text-muted-foreground">{method.desc}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Order summary */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-5 h-fit sticky top-20 space-y-4"
                >
                  <h3 className="font-bold text-foreground text-sm">ملخص الطلب</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.bookId} className="flex items-center gap-2">
                        <img src={item.image} alt="" className="w-8 h-10 rounded object-cover border border-border/20" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                        </div>
                        <p className="text-xs font-bold text-foreground flex-shrink-0">
                          {item.price > 0 ? `${item.price} د.م` : "مجاني"}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Coupon */}
                  <Separator className="bg-border/20" />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Ticket className="w-3 h-3" /> كوبون خصم</p>
                    {couponResult?.isValid ? (
                      <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-semibold text-primary">{couponResult.code}</span>
                          <span className="text-[10px] text-muted-foreground">{couponResult.message}</span>
                        </div>
                        <button onClick={removeCoupon} className="p-1 hover:bg-destructive/10 rounded transition-colors">
                          <X className="w-3 h-3 text-destructive" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="أدخل الكوبون"
                          className="rounded-lg bg-background/50 border-border/20 text-xs h-9"
                          dir="ltr"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-lg h-9 text-xs px-3"
                          disabled={validatingCoupon || !couponCode.trim()}
                          onClick={handleApplyCoupon}
                        >
                          {validatingCoupon ? <Loader2 className="w-3 h-3 animate-spin" /> : "تطبيق"}
                        </Button>
                      </div>
                    )}
                    {couponResult && !couponResult.isValid && (
                      <p className="text-[10px] text-destructive">{couponResult.message}</p>
                    )}
                  </div>

                  <Separator className="bg-border/20" />
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>الكتب ({itemCount})</span>
                      <span>{totalPrice} د.م</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-primary">
                        <span className="text-xs">الخصم</span>
                        <span className="text-xs font-semibold">-{discountAmount} د.م</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                      <span>التوصيل</span>
                      <span className="text-xs font-semibold" style={{ color: "hsl(var(--primary))" }}>مجاني</span>
                    </div>
                  </div>
                  <Separator className="bg-border/20" />
                  <div className="flex justify-between font-bold text-foreground">
                    <span>الإجمالي</span>
                    <span className="text-primary text-lg">{finalTotal} د.م</span>
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl h-12 gap-2 text-sm font-semibold shadow-lg shadow-primary/20"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ إنشاء الطلب...</>
                    ) : (
                      <><ArrowLeft className="w-4 h-4" /> تأكيد الطلب — {finalTotal} د.م</>
                    )}
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3" /> معاملة آمنة ومشفرة
                  </p>
                </motion.div>
              </div>
            </form>
          </div>
        </section>
        <Footer />
      </div>
    </div>
  );
};

export default CheckoutPage;
