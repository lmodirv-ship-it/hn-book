import { useState } from "react";
import { motion } from "framer-motion";
import { Wand2, PenLine, Loader2, Plus, Sparkles, Upload, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookCatalogUpload } from "@/admin/components/BookCatalogUpload";

const CATEGORIES = [
  "كتب عامة",
  "تطوير الذات",
  "الصحة واللياقة",
  "الأعمال والتسويق",
  "المالية والاستثمار",
  "التقنية والبرمجة",
  "الطبخ والتغذية",
  "الأدب والروايات",
  "التعليم والدراسة",
  "eBooks & PLR",
  "Design Templates",
  "Online Courses",
  "AI Tools",
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}

const BookGeneration = () => {
  const [activeTab, setActiveTab] = useState<"ai" | "manual" | "catalog">("ai");

  // AI generation state
  const [autoCategory, setAutoCategory] = useState(CATEGORIES[0]);
  const [autoCount, setAutoCount] = useState("5");
  const [generating, setGenerating] = useState(false);
  const [generatedBooks, setGeneratedBooks] = useState<any[]>([]);

  // Manual form state
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [pages, setPages] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [badge, setBadge] = useState("");
  const [features, setFeatures] = useState("");

  const handleAIGenerate = async () => {
    const count = Math.min(Math.max(parseInt(autoCount) || 1, 1), 20);
    setGenerating(true);
    setGeneratedBooks([]);

    try {
      const { data, error } = await supabase.functions.invoke("generate-books", {
        body: { category: autoCategory, count, language: "ar" },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedBooks(data.books || []);
      toast.success(`تم توليد ${data.count} كتاب بالذكاء الاصطناعي`);
    } catch (e: any) {
      toast.error(e.message || "فشل في توليد الكتب");
    } finally {
      setGenerating(false);
    }
  };

  const handleManualSave = async () => {
    if (!name.trim() || !price) {
      toast.error("يرجى ملء الاسم والسعر");
      return;
    }
    setSaving(true);
    const desc = [description, author && `المؤلف: ${author}`, pages && `عدد الصفحات: ${pages}`].filter(Boolean).join("\n");
    const featureList = features.split("\n").map(f => f.trim()).filter(Boolean);

    const { error } = await supabase.from("products").insert({
      name: name.trim(),
      short_description: shortDesc.trim() || null,
      description: desc || null,
      price: Number(price),
      original_price: originalPrice ? Number(originalPrice) : null,
      category,
      badge: badge.trim() || null,
      features: featureList.length > 0 ? featureList : null,
      is_active: true,
    });
    setSaving(false);
    if (error) { toast.error("فشل في إضافة المنتج"); return; }
    toast.success("تم إضافة المنتج بنجاح");
    setName(""); setShortDesc(""); setDescription(""); setAuthor(""); setPages("");
    setPrice(""); setOriginalPrice(""); setBadge(""); setFeatures("");
  };

  const tabs = [
    { id: "ai" as const, icon: Wand2, label: "توليد بالذكاء الاصطناعي" },
    { id: "manual" as const, icon: PenLine, label: "إضافة يدوية" },
    { id: "catalog" as const, icon: Upload, label: "استيراد كتالوج PDF" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground">📚 توليد وإضافة الكتب</h1>
        <p className="text-sm text-muted-foreground mt-0.5">أضف كتباً يدوياً أو ولّدها بالذكاء الاصطناعي أو استوردها من كتالوج PDF</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-xl text-sm transition-all ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* AI Generation */}
      {activeTab === "ai" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-5 max-w-2xl">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-primary">يستخدم الذكاء الاصطناعي لتوليد كتب عربية بأسماء وأوصاف ومؤلفين واقعيين بـ 3 لغات</p>
          </div>

          <Field label="التصنيف">
            <select value={autoCategory} onChange={(e) => { setAutoCategory(e.target.value); setGeneratedBooks([]); }}
              className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="عدد الكتب (1-20)">
            <Input type="number" min={1} max={20} value={autoCount} onChange={(e) => setAutoCount(e.target.value)} className="bg-card" />
          </Field>

          <Button onClick={handleAIGenerate} className="w-full gap-1.5" disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {generating ? "جاري التوليد بالذكاء الاصطناعي..." : "توليد الكتب"}
          </Button>

          {generatedBooks.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto border border-border rounded-xl p-3">
              {generatedBooks.map((b, i) => {
                const ml = b._multilingual;
                return (
                  <div key={i} className="p-3 rounded-lg bg-secondary/30 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{b.badge}</span>
                      <span className="text-primary font-semibold">${b.price}</span>
                    </div>
                    {ml ? (
                      <div className="space-y-0.5">
                        <p className="text-foreground">🇸🇦 {ml.ar.name}</p>
                        <p className="text-muted-foreground">🇫🇷 {ml.fr.name}</p>
                        <p className="text-muted-foreground">🇬🇧 {ml.en.name}</p>
                      </div>
                    ) : (
                      <p className="text-foreground truncate">{b.name}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {generatedBooks.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">✅ تم حفظ {generatedBooks.length} كتاب بـ 3 لغات (عربي، فرنسي، إنجليزي)</p>
          )}
        </motion.div>
      )}

      {/* Manual Add */}
      {activeTab === "manual" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-4 max-w-2xl">
          <Field label="اسم الكتاب *">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: فن الإدارة الحديثة" className="bg-card" />
          </Field>
          <Field label="وصف قصير">
            <Input value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} placeholder="وصف مختصر سطر واحد" className="bg-card" />
          </Field>
          <Field label="الوصف المفصل">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف تفصيلي للكتاب..." className="bg-card min-h-[80px]" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="المؤلف">
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="اسم المؤلف" className="bg-card" />
            </Field>
            <Field label="عدد الصفحات">
              <Input type="number" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="250" className="bg-card" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="السعر *">
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="29" className="bg-card" />
            </Field>
            <Field label="السعر الأصلي">
              <Input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="59" className="bg-card" />
            </Field>
          </div>
          <Field label="التصنيف">
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="المميزات (سطر لكل ميزة)">
            <Textarea value={features} onChange={(e) => setFeatures(e.target.value)} placeholder={"PDF عالي الجودة\nقابل للطباعة\nتحديثات مجانية"} className="bg-card min-h-[60px]" />
          </Field>
          <Field label="الرمز (اختياري)">
            <Input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="مثال: جديد، خصم" className="bg-card" />
          </Field>
          <Button onClick={handleManualSave} disabled={saving} className="w-full gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            حفظ الكتاب
          </Button>
        </motion.div>
      )}

      {/* Catalog Import */}
      {activeTab === "catalog" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6 max-w-2xl">
          <BookCatalogUpload onComplete={() => toast.success("تم تحديث قائمة الكتب")} />
        </motion.div>
      )}
    </div>
  );
};

export default BookGeneration;
