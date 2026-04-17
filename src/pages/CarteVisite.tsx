import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import {
  printService, calculatePrice, QUANTITIES, PAPER_TYPES, PRINT_TYPES, TEMPLATE_CATEGORIES,
  type CardTemplate, type Logo,
} from "@/services/printService";
import CardPreviewHTML, { type CardPreviewHandle } from "@/components/carte-visite/CardPreviewHTML";
import {
  CreditCard, CheckCircle2, ChevronLeft, ChevronRight, Download,
  Loader2, Layers, Palette, User, Star, Phone, Mail, MapPin, Image, Eye,
} from "lucide-react";

const STEPS = [
  { label: "التصميم", icon: Palette },
  { label: "الشعار", icon: Image },
  { label: "البيانات", icon: User },
  { label: "الطباعة", icon: Layers },
  { label: "معاينة", icon: Eye },
  { label: "التأكيد", icon: CheckCircle2 },
];

const CarteVisite = () => {
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [customLogoUrl, setCustomLogoUrl] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [quantity, setQuantity] = useState(100);
  const [paperType, setPaperType] = useState("standard");
  const [printType, setPrintType] = useState("one_side");
  const [notes, setNotes] = useState("");
  const [popularIds, setPopularIds] = useState<string[]>([]);
  const previewRef = useRef<CardPreviewHandle>(null);

  const [form, setForm] = useState({
    name: "", job_title: "", phone: "", email: "", address: "", city: "", country: "MA", company: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [orderDone, setOrderDone] = useState(false);

  useEffect(() => {
    Promise.all([
      printService.getTemplates(),
      printService.getPopularTemplates(),
      printService.getLogos(),
    ]).then(([t, pop, l]) => {
      setTemplates(t);
      setPopularIds(pop);
      setLogos(l);
      setLoading(false);
    });
    (async () => {
      const sessionResult = await authService.getSession();
      if (sessionResult.data) {
        const profileResult = await authService.getProfile(sessionResult.data.user.id);
        if (profileResult.data) {
          setForm(f => ({ ...f, name: profileResult.data!.displayName || "", phone: profileResult.data!.phone || "", email: sessionResult.data!.user.email || "" }));
        }
      }
    })();
  }, []);

  const filteredTemplates = useMemo(() => {
    if (activeCategory === "all") return templates;
    return templates.filter(t => t.category === activeCategory);
  }, [templates, activeCategory]);

  const price = useMemo(() => calculatePrice(quantity, paperType, printType), [quantity, paperType, printType]);
  const selectedTpl = templates.find(t => t.id === selectedTemplate);
  const selectedLogoObj = logos.find(l => l.id === selectedLogo);
  const logoUrl = customLogoUrl || selectedLogoObj?.image_url || "";

  const userData: Record<string, string> = {
    name: form.name,
    job_title: form.job_title,
    company: form.company,
    phone: form.phone,
    email: form.email,
    address: form.address ? `${form.address}, ${form.city}` : form.city,
  };

  const canNext = () => {
    if (step === 0) return !!selectedTemplate;
    if (step === 1) return true; // logo is optional
    if (step === 2) return form.name.trim() && form.phone.trim();
    if (step === 3) return true;
    if (step === 4) return form.address.trim() && form.city.trim() && form.email.trim();
    return true;
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await previewRef.current?.exportPDF();
    } catch { /* ignore */ }
    setExporting(false);
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `logos/${Date.now()}.${ext}`;
    const { data: uploadData, error } = await (await import("@/api/client")).db.storage.from("book-images").upload(path, file);
    if (error) {
      toast({ title: "فشل رفع الشعار", variant: "destructive" });
      return;
    }
    const { data: urlData } = (await import("@/api/client")).db.storage.from("book-images").getPublicUrl(path);
    setCustomLogoUrl(urlData.publicUrl);
    setSelectedLogo(null);
    toast({ title: "تم رفع الشعار ✅" });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const sessionResult = await authService.getSession();
      if (!sessionResult.data) {
        toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" });
        setSubmitting(false);
        return;
      }
      const user = sessionResult.data.user;
      await printService.createOrder({
        user_id: user.id,
        template_id: selectedTemplate!,
        logo_id: selectedLogo || null,
        quantity,
        paper_type: paperType,
        print_type: printType,
        total_price: price,
        customer_name: form.name,
        job_title: form.job_title,
        email: form.email,
        company: form.company,
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
          <Button onClick={() => { setOrderDone(false); setStep(0); setSelectedTemplate(null); setSelectedLogo(null); setCustomLogoUrl(""); }}>
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
      <section className="relative py-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">خدمة الطباعة</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
            بطاقات <span className="text-primary">أعمال</span> في ثوانٍ
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            اختر تصميم، أضف شعارك، أدخل بياناتك — وحمّل بطاقتك جاهزة للطباعة
          </p>
        </div>
      </section>

      {/* Steps */}
      <div className="container mx-auto px-4 mb-8">
        <div className="flex items-center justify-center gap-1 md:gap-2 flex-wrap">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <div key={i} className="flex items-center gap-1">
                <button
                  onClick={() => { if (done) setStep(i); }}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-[10px] md:text-[11px] font-medium transition-all ${
                    active ? "bg-primary text-primary-foreground" : done ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden md:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronLeft className="w-3 h-3 text-muted-foreground/30" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16">
        <AnimatePresence mode="wait">
          {/* Step 0: Choose Template */}
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <h2 className="text-xl font-bold text-foreground mb-4">اختر التصميم</h2>
              <div className="flex flex-wrap gap-2 mb-6">
                <button onClick={() => setActiveCategory("all")} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${activeCategory === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>الكل</button>
                {TEMPLATE_CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setActiveCategory(c.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${activeCategory === c.value ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>{c.label}</button>
                ))}
              </div>
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[1.8/1] bg-muted/10 rounded-xl animate-pulse" />)}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-semibold">لا توجد تصاميم</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredTemplates.map(t => (
                    <motion.button key={t.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => { window.location.href = `/template-editor/${t.id}?from=studio`; }}
                      className="relative rounded-xl overflow-hidden border-2 border-border hover:border-primary/40 transition-all text-right">
                      <div className="aspect-[1.8/1] bg-muted/10"><img src={t.image_url} alt={t.name} className="w-full h-full object-cover" /></div>
                      <div className="p-2 bg-card flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground">{TEMPLATE_CATEGORIES.find(c => c.value === t.category)?.label}</p>
                        </div>
                        {popularIds.includes(t.id) && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-0.5 shrink-0"><Star className="w-2.5 h-2.5" /> شائع</Badge>}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 1: Choose Logo */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="max-w-3xl mx-auto">
              <h2 className="text-xl font-bold text-foreground mb-2">اختر شعارك (اختياري)</h2>
              <p className="text-sm text-muted-foreground mb-6">اختر شعار من المكتبة أو ارفع شعارك الخاص</p>

              {/* Upload custom */}
              <div className="mb-6 p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 text-center">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
                  <div className="flex flex-col items-center gap-2">
                    {customLogoUrl ? (
                      <img src={customLogoUrl} alt="Custom logo" className="w-16 h-16 object-contain rounded-lg bg-white p-1" />
                    ) : (
                      <Image className="w-8 h-8 text-primary/50" />
                    )}
                    <p className="text-sm text-primary font-medium">{customLogoUrl ? "تغيير الشعار" : "ارفع شعارك الخاص"}</p>
                  </div>
                </label>
              </div>

              {/* Logo library */}
              {logos.length > 0 && (
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {logos.map(l => (
                    <button
                      key={l.id}
                      onClick={() => { setSelectedLogo(l.id); setCustomLogoUrl(""); }}
                      className={`p-2 rounded-xl border-2 transition-all bg-white ${
                        selectedLogo === l.id ? "border-primary shadow-md" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <img src={l.image_url} alt={l.name} className="w-full aspect-square object-contain" />
                      <p className="text-[9px] text-muted-foreground truncate mt-1 text-center">{l.name}</p>
                    </button>
                  ))}
                </div>
              )}

              {logos.length === 0 && !customLogoUrl && (
                <p className="text-center text-muted-foreground text-sm py-8">لا توجد شعارات في المكتبة بعد — يمكنك رفع شعارك الخاص</p>
              )}
            </motion.div>
          )}

          {/* Step 2: User Data */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="max-w-lg mx-auto space-y-4">
              <h2 className="text-xl font-bold text-foreground mb-2">بيانات البطاقة</h2>
              <p className="text-sm text-muted-foreground mb-4">هذه البيانات ستظهر على بطاقتك</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label className="mb-1 block text-sm">الاسم الكامل *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="محمد أمين" /></div>
                <div><Label className="mb-1 block text-sm">المسمى الوظيفي</Label><Input value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} placeholder="مدير تسويق" /></div>
                <div><Label className="mb-1 block text-sm">الشركة</Label><Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="HN Groupe" /></div>
                <div><Label className="mb-1 block text-sm">الهاتف *</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+212 6XX XXX XXX" /></div>
                <div><Label className="mb-1 block text-sm">البريد الإلكتروني *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" /></div>
                <div><Label className="mb-1 block text-sm">العنوان</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="شارع..." /></div>
                <div><Label className="mb-1 block text-sm">المدينة *</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="الدار البيضاء" /></div>
                <div><Label className="mb-1 block text-sm">البلد</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="MA" /></div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Print Options */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-xl font-bold text-foreground mb-2">خيارات الطباعة</h2>
              <div>
                <Label className="text-sm font-semibold mb-2 block">الكمية</Label>
                <div className="grid grid-cols-4 gap-2">
                  {QUANTITIES.map(q => (<button key={q} onClick={() => setQuantity(q)} className={`py-3 rounded-xl text-center font-bold transition-all border ${quantity === q ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-foreground hover:border-primary/40"}`}>{q}</button>))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold mb-2 block">نوع الورق</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PAPER_TYPES.map(p => (<button key={p.value} onClick={() => setPaperType(p.value)} className={`p-3 rounded-xl text-center transition-all border ${paperType === p.value ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-foreground hover:border-primary/40"}`}><p className="font-bold text-sm">{p.label}</p><p className="text-[11px] text-muted-foreground mt-0.5">{p.description}</p></button>))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold mb-2 block">نوع الطباعة</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PRINT_TYPES.map(p => (<button key={p.value} onClick={() => setPrintType(p.value)} className={`py-3 rounded-xl text-center font-bold transition-all border ${printType === p.value ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-foreground hover:border-primary/40"}`}>{p.label}</button>))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold mb-1 block">ملاحظات (اختياري)</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="أي ملاحظات خاصة..." rows={2} />
              </div>
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
                <p className="text-sm text-muted-foreground mb-1">السعر الإجمالي</p>
                <p className="text-3xl font-bold text-primary">{price} <span className="text-base">د.م</span></p>
              </div>
            </motion.div>
          )}

          {/* Step 4: Preview */}
          {step === 4 && selectedTpl && (
            <motion.div key="s4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="max-w-xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">معاينة بطاقتك</h2>
                <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting} className="gap-1.5">
                  {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  تحميل PDF
                </Button>
              </div>
              <div className="rounded-xl overflow-hidden border-2 border-border shadow-xl">
                <CardPreviewHTML
                  ref={previewRef}
                  backgroundUrl={selectedTpl.image_url}
                  logoUrl={logoUrl}
                  userData={userData}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">هذه معاينة تقريبية — النتيجة النهائية ستكون بجودة طباعة عالية</p>
            </motion.div>
          )}

          {/* Step 5: Confirm */}
          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="max-w-lg mx-auto">
              <h2 className="text-xl font-bold text-foreground mb-4">تأكيد الطلب</h2>
              <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                {selectedTpl && (
                  <div className="p-4 flex items-center gap-4">
                    <img src={selectedTpl.image_url} alt="" className="w-20 h-12 rounded-lg object-cover" />
                    <div>
                      <p className="font-semibold text-foreground">{selectedTpl.name}</p>
                      <p className="text-xs text-muted-foreground">{TEMPLATE_CATEGORIES.find(c => c.value === selectedTpl.category)?.label}</p>
                    </div>
                    {logoUrl && <img src={logoUrl} alt="" className="w-10 h-10 object-contain rounded bg-white p-0.5 mr-auto" />}
                  </div>
                )}
                <div className="p-4 grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">الكمية</span><span className="text-foreground font-medium">{quantity}</span>
                  <span className="text-muted-foreground">الورق</span><span className="text-foreground font-medium">{PAPER_TYPES.find(p => p.value === paperType)?.label}</span>
                  <span className="text-muted-foreground">الطباعة</span><span className="text-foreground font-medium">{PRINT_TYPES.find(p => p.value === printType)?.label}</span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">الاسم</span><span className="text-foreground font-medium">{form.name}</span>
                  {form.job_title && <><span className="text-muted-foreground">الوظيفة</span><span className="text-foreground font-medium">{form.job_title}</span></>}
                  {form.company && <><span className="text-muted-foreground">الشركة</span><span className="text-foreground font-medium">{form.company}</span></>}
                  <span className="text-muted-foreground">الهاتف</span><span className="text-foreground font-medium">{form.phone}</span>
                  <span className="text-muted-foreground">البريد</span><span className="text-foreground font-medium">{form.email}</span>
                  <span className="text-muted-foreground">العنوان</span><span className="text-foreground font-medium">{form.address}, {form.city}</span>
                </div>
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">المجموع</p>
                  <p className="text-3xl font-bold text-primary">{price} <span className="text-base">د.م</span></p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between max-w-2xl mx-auto mt-8">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0} className="gap-1.5">
            <ChevronRight className="w-4 h-4" /> السابق
          </Button>
          {step < 5 ? (
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
