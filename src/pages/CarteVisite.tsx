import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  printService, calculatePrice, QUANTITIES, PAPER_TYPES, PRINT_TYPES,
  type CardTemplate,
} from "@/services/printService";
import {
  CreditCard, CheckCircle2, ChevronLeft, ChevronRight,
  Loader2, Layers, Palette, Truck, Phone, MapPin, User, FileText,
} from "lucide-react";

const STEPS = [
  { label: "اختر التصميم", icon: Palette },
  { label: "الخيارات", icon: Layers },
  { label: "معلوماتك", icon: User },
  { label: "التأكيد", icon: CheckCircle2 },
];

const CarteVisite = () => {
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [paperType, setPaperType] = useState("standard");
  const [printType, setPrintType] = useState("one_side");
  const [notes, setNotes] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", country: "MA" });
  const [submitting, setSubmitting] = useState(false);
  const [orderDone, setOrderDone] = useState(false);

  useEffect(() => {
    printService.getTemplates().then(t => { setTemplates(t); setLoading(false); });
  }, []);

  const price = useMemo(() => calculatePrice(quantity, paperType, printType), [quantity, paperType, printType]);
  const selectedTpl = templates.find(t => t.id === selectedTemplate);

  const canNext = () => {
    if (step === 0) return !!selectedTemplate;
    if (step === 1) return true;
    if (step === 2) return form.name.trim() && form.phone.trim() && form.address.trim() && form.city.trim();
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" });
        setSubmitting(false);
        return;
      }
      await printService.createOrder({
        user_id: user.id,
        template_id: selectedTemplate!,
        quantity,
        paper_type: paperType,
        print_type: printType,
        total_price: price,
        customer_name: form.name,
        phone: form.phone,
        address: form.address,
        city: form.city,
        country: form.country,
        notes,
      });
      setOrderDone(true);
      toast({ title: "تم إرسال طلبك بنجاح ✅" });
    } catch (err: any) {
      toast({ title: err.message || "حدث خطأ", variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (orderDone) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground mb-3">تم استلام طلبك!</h1>
          <p className="text-muted-foreground mb-2">سيتم التواصل معك قريباً لتأكيد التفاصيل.</p>
          <p className="text-lg font-bold text-primary mb-6">{price} د.م</p>
          <Button onClick={() => { setOrderDone(false); setStep(0); setSelectedTemplate(null); }}>
            طلب جديد
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />

      {/* Hero */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">خدمة الطباعة</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
            بطاقات <span className="text-primary">أعمال</span> احترافية
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            اختر تصميمك المفضل واطلب طباعة بطاقاتك بجودة عالية
          </p>
        </div>
      </section>

      {/* Steps indicator */}
      <div className="container mx-auto px-4 mb-8">
        <div className="flex items-center justify-center gap-2 md:gap-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  active ? "bg-primary text-primary-foreground" : done ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <ChevronLeft className="w-4 h-4 text-muted-foreground/40" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16">
        <AnimatePresence mode="wait">
          {/* Step 0: Choose Template */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <h2 className="text-xl font-bold text-foreground mb-6">اختر التصميم</h2>
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-[1.8/1] bg-muted/10 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-semibold">لا توجد تصاميم متاحة حالياً</p>
                  <p className="text-sm mt-1">سيتم إضافة تصاميم جديدة قريباً</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {templates.map(t => (
                    <motion.button
                      key={t.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                        selectedTemplate === t.id
                          ? "border-primary shadow-lg shadow-primary/20"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="aspect-[1.8/1] bg-muted/10">
                        <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-2.5 bg-card">
                        <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                      </div>
                      {selectedTemplate === t.id && (
                        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 1: Customization */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <h2 className="text-xl font-bold text-foreground mb-2">خيارات الطباعة</h2>

              {/* Selected template preview */}
              {selectedTpl && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
                  <img src={selectedTpl.image_url} alt={selectedTpl.name} className="w-24 h-14 rounded-lg object-cover" />
                  <div>
                    <p className="font-semibold text-foreground">{selectedTpl.name}</p>
                    <p className="text-xs text-muted-foreground">التصميم المختار</p>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">الكمية</Label>
                <div className="grid grid-cols-4 gap-2">
                  {QUANTITIES.map(q => (
                    <button
                      key={q}
                      onClick={() => setQuantity(q)}
                      className={`py-3 rounded-xl text-center font-bold transition-all border ${
                        quantity === q
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-card border-border text-foreground hover:border-primary/40"
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper type */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">نوع الورق</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PAPER_TYPES.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPaperType(p.value)}
                      className={`p-3 rounded-xl text-center transition-all border ${
                        paperType === p.value
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-card border-border text-foreground hover:border-primary/40"
                      }`}
                    >
                      <p className="font-bold text-sm">{p.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{p.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Print type */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">نوع الطباعة</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PRINT_TYPES.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPrintType(p.value)}
                      className={`py-3 rounded-xl text-center font-bold transition-all border ${
                        printType === p.value
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-card border-border text-foreground hover:border-primary/40"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-sm font-semibold mb-1 block">ملاحظات (اختياري)</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="أي تعديلات أو ملاحظات خاصة..." rows={2} />
              </div>

              {/* Price */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
                <p className="text-sm text-muted-foreground mb-1">السعر الإجمالي</p>
                <p className="text-3xl font-bold text-primary">{price} <span className="text-base">د.م</span></p>
              </div>
            </motion.div>
          )}

          {/* Step 2: Customer Info */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="max-w-lg mx-auto space-y-4"
            >
              <h2 className="text-xl font-bold text-foreground mb-2">معلومات التوصيل</h2>
              <div>
                <Label className="flex items-center gap-1.5 mb-1"><User className="w-3.5 h-3.5" /> الاسم الكامل</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="محمد أمين" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 mb-1"><Phone className="w-3.5 h-3.5" /> الهاتف</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+212 6XX XXX XXX" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 mb-1"><MapPin className="w-3.5 h-3.5" /> العنوان</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="شارع..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block">المدينة</Label>
                  <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="الدار البيضاء" />
                </div>
                <div>
                  <Label className="mb-1 block">البلد</Label>
                  <Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="MA" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="max-w-lg mx-auto"
            >
              <h2 className="text-xl font-bold text-foreground mb-4">تأكيد الطلب</h2>
              <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                {selectedTpl && (
                  <div className="p-4 flex items-center gap-4">
                    <img src={selectedTpl.image_url} alt="" className="w-20 h-12 rounded-lg object-cover" />
                    <div>
                      <p className="font-semibold text-foreground">{selectedTpl.name}</p>
                      <p className="text-xs text-muted-foreground">التصميم المختار</p>
                    </div>
                  </div>
                )}
                <div className="p-4 grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">الكمية</span><span className="text-foreground font-medium text-left">{quantity}</span>
                  <span className="text-muted-foreground">الورق</span><span className="text-foreground font-medium text-left">{PAPER_TYPES.find(p => p.value === paperType)?.label}</span>
                  <span className="text-muted-foreground">الطباعة</span><span className="text-foreground font-medium text-left">{PRINT_TYPES.find(p => p.value === printType)?.label}</span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">الاسم</span><span className="text-foreground font-medium text-left">{form.name}</span>
                  <span className="text-muted-foreground">الهاتف</span><span className="text-foreground font-medium text-left">{form.phone}</span>
                  <span className="text-muted-foreground">العنوان</span><span className="text-foreground font-medium text-left">{form.address}, {form.city}</span>
                </div>
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">المجموع</p>
                  <p className="text-3xl font-bold text-primary">{price} <span className="text-base">د.م</span></p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between max-w-2xl mx-auto mt-8">
          <Button
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="gap-1.5"
          >
            <ChevronRight className="w-4 h-4" /> السابق
          </Button>

          {step < 3 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="gap-1.5">
              التالي <ChevronLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              تأكيد الطلب
            </Button>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CarteVisite;
