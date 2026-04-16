import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bookService, categoryService } from "@/services";
import type { Category } from "@/services/categoryService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wand2, PenLine, Loader2, Plus, Sparkles, FileText, Upload, AlertCircle, ImageIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { detectCategory } from "@/lib/category-detection";
import { storageService } from "@/services/storageService";

interface ProductCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductCreated: () => void;
}

export function ProductCreateDialog({ open, onOpenChange, onProductCreated }: ProductCreateDialogProps) {
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  
  useEffect(() => {
    if (open) {
      categoryService.getAll().then((r) => {
        if (r.data) setDbCategories(r.data);
      });
    }
  }, [open]);

  const categoryNames = dbCategories.map((c) => c.name);
  
  const [mode, setMode] = useState<"choose" | "manual" | "auto">("choose");
  const [saving, setSaving] = useState(false);

  // Manual form
  const [name, setName] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [pages, setPages] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [category, setCategory] = useState(categoryNames[0] || "كتب عامة");
  const [categorySuggested, setCategorySuggested] = useState(false);
  const [badge, setBadge] = useState("");
  const [features, setFeatures] = useState("");

  // Auto state
  const [autoCategory, setAutoCategory] = useState(categoryNames[0] || "كتب عامة");
  const [autoCount, setAutoCount] = useState("5");
  const [generating, setGenerating] = useState(false);
  const [generatedBooks, setGeneratedBooks] = useState<any[]>([]);

  const reset = () => {
    setMode("choose");
    setName(""); setShortDesc(""); setDescription(""); setAuthor(""); setPages("");
    setPrice(""); setOriginalPrice(""); setCategory(categoryNames[0] || "كتب عامة"); setBadge(""); setFeatures("");
    setGeneratedBooks([]); setAutoCount("5"); setGenerating(false);
  };

  // Auto-detect category when name or description changes
  const runAutoDetect = (newName: string, newDesc: string) => {
    if (!newName.trim()) return;
    const suggestion = detectCategory(newName, newDesc, categoryNames);
    if (suggestion.matchedKeywords.length > 0) {
      setCategory(suggestion.category);
      setCategorySuggested(true);
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    runAutoDetect(val, description);
  };

  const handleDescChange = (val: string) => {
    setDescription(val);
    runAutoDetect(name, val);
  };

  const handleManualSave = async () => {
    if (!name.trim()) {
      toast.error("يرجى إدخال اسم الكتاب");
      return;
    }
    if (!price) {
      toast.error("يرجى إدخال السعر");
      return;
    }
    setSaving(true);
    const desc = [description, author && `المؤلف: ${author}`, pages && `عدد الصفحات: ${pages}`].filter(Boolean).join("\n");
    const featureList = features.split("\n").map(f => f.trim()).filter(Boolean);

    const result = await bookService.create({
      name: name.trim(),
      shortDescription: shortDesc.trim() || undefined,
      description: desc || undefined,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      category,
      badge: badge.trim() || undefined,
      features: featureList.length > 0 ? featureList : undefined,
    });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("تم إضافة المنتج — يرجى رفع ملف PDF وصورة الغلاف من صفحة التعديل");
    onProductCreated(); reset(); onOpenChange(false);
  };

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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {mode === "choose" ? "إضافة كتب" : mode === "manual" ? "إضافة يدوية" : "توليد بالذكاء الاصطناعي"}
          </DialogTitle>
        </DialogHeader>

        {mode === "choose" && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button onClick={() => setMode("manual")}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group">
              <PenLine className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
              <div className="text-center">
                <p className="font-semibold text-foreground text-sm">إضافة يدوية</p>
                <p className="text-xs text-muted-foreground mt-1">أدخل بيانات الكتاب يدوياً</p>
              </div>
            </button>
            <button onClick={() => setMode("auto")}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group">
              <Wand2 className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
              <div className="text-center">
                <p className="font-semibold text-foreground text-sm">توليد بالذكاء الاصطناعي</p>
                <p className="text-xs text-muted-foreground mt-1">كتب عربية واقعية بأسماء وأوصاف AI</p>
              </div>
            </button>
          </div>
        )}

        {mode === "manual" && (
          <div className="space-y-3 pt-2">
            <Field label="اسم الكتاب *">
              <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="مثال: فن الإدارة الحديثة" className="bg-card" />
            </Field>
            <Field label="وصف قصير">
              <Input value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} placeholder="وصف مختصر سطر واحد" className="bg-card" />
            </Field>
            <Field label="الوصف المفصل">
              <Textarea value={description} onChange={(e) => handleDescChange(e.target.value)} placeholder="وصف تفصيلي للكتاب..." className="bg-card min-h-[60px]" />
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
            <Field label={`التصنيف${categorySuggested ? " ✨ مقترح تلقائياً" : ""}`}>
              <select value={category} onChange={(e) => { setCategory(e.target.value); setCategorySuggested(false); }}
                className={`w-full h-10 rounded-md border px-3 text-sm text-foreground ${categorySuggested ? "border-primary/50 bg-primary/5" : "border-input bg-card"}`}>
                {categoryNames.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {categorySuggested && (
                <p className="text-[10px] text-primary mt-1">تم اقتراح التصنيف بناءً على العنوان والوصف — يمكنك تغييره</p>
              )}
            </Field>
            <Field label="المميزات (سطر لكل ميزة)">
              <Textarea value={features} onChange={(e) => setFeatures(e.target.value)} placeholder={"PDF عالي الجودة\nقابل للطباعة\nتحديثات مجانية"} className="bg-card min-h-[60px]" />
            </Field>
            <Field label="الرمز (اختياري)">
              <Input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="مثال: جديد، خصم" className="bg-card" />
            </Field>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleManualSave} disabled={saving} className="flex-1 gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                حفظ الكتاب
              </Button>
              <Button variant="outline" onClick={() => setMode("choose")}>رجوع</Button>
            </div>
          </div>
        )}

        {mode === "auto" && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <p className="text-xs text-primary">يستخدم الذكاء الاصطناعي لتوليد كتب عربية بأسماء وأوصاف ومؤلفين واقعيين</p>
            </div>
            <Field label="التصنيف">
              <select value={autoCategory} onChange={(e) => { setAutoCategory(e.target.value); setGeneratedBooks([]); }}
                className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground">
                {categoryNames.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="عدد الكتب (1-20)">
              <Input type="number" min={1} max={20} value={autoCount} onChange={(e) => setAutoCount(e.target.value)} className="bg-card" />
            </Field>
            <Button onClick={handleAIGenerate} variant="outline" className="w-full gap-1.5" disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {generating ? "جاري التوليد بالذكاء الاصطناعي..." : "توليد الكتب"}
            </Button>

            {generatedBooks.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto border border-border rounded-lg p-2">
                {generatedBooks.map((b, i) => {
                  const ml = b._multilingual;
                  return (
                    <div key={i} className="p-2.5 rounded-lg bg-secondary/30 text-xs space-y-1">
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

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setMode("choose")} className="flex-1">رجوع</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}
