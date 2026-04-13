import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wand2, PenLine, Loader2, RefreshCw, Plus } from "lucide-react";

interface ProductCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductCreated: () => void;
}

const CATEGORIES = [
  "eBooks & PLR",
  "Design Templates",
  "Online Courses",
  "AI Tools",
  "Design Assets",
  "Business Courses",
  "Video Courses",
  "Language Courses",
];

const SAMPLE_TOPICS: Record<string, string[]> = {
  "eBooks & PLR": ["Self-Help", "Health & Fitness", "Business", "Marketing", "Finance", "Cooking", "Technology", "Productivity"],
  "Design Templates": ["Business", "Fitness", "Restaurant", "Fashion", "Beauty", "Travel", "Wedding", "Real Estate"],
  "Online Courses": ["Facebook Ads", "Instagram Marketing", "SEO Mastery", "Copywriting Pro", "Python Basics", "React Development"],
  "AI Tools": ["Business Marketing", "Content Writing", "Social Media", "Email Campaigns", "Blog Posts", "Code Generation"],
  "Design Assets": ["Logo Templates", "Business Cards", "Flyers & Posters", "Icon Packs", "UI Kits", "Mockup Templates"],
  "Business Courses": ["Shopify Dropshipping", "Amazon FBA", "Print on Demand", "Freelancing Pro", "Course Creation"],
  "Video Courses": ["Web Development", "Data Science", "Animation", "Music Production", "Photography"],
  "Language Courses": ["English", "French", "Spanish", "German", "Arabic", "Japanese", "Korean", "Chinese Mandarin"],
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateProduct(category: string, topic: string) {
  const count = randomInt(50, 500);
  const price = randomInt(5, 49);
  const originalPrice = price + randomInt(10, 50);

  const templates: Record<string, { name: string; short: string; features: string[] }[]> = {
    "eBooks & PLR": [
      { name: `${topic} eBook Bundle — ${count}+ Books`, short: `${count}+ eBooks on ${topic} with full PLR resale rights`, features: ["Full PLR Rights", "Instant Download", "Editable Source Files", "Commercial License"] },
    ],
    "Design Templates": [
      { name: `${topic} Canva Templates — ${count}+`, short: `${count}+ editable Canva templates for ${topic}`, features: ["Canva Editable", "Commercial License", "All Sizes", "Print Ready"] },
    ],
    "Online Courses": [
      { name: `${topic} Masterclass — Complete`, short: `Complete ${topic} course beginner to advanced`, features: ["HD Video", "Certificate", "Lifetime Access", "Community"] },
    ],
    "AI Tools": [
      { name: `ChatGPT ${topic} Prompts — ${count}+`, short: `${count}+ ChatGPT prompts for ${topic}`, features: [`${count}+ Prompts`, "Copy-Paste Ready", "Categorized", "Regular Updates"] },
    ],
    "Design Assets": [
      { name: `${topic} Design Pack — ${count}+`, short: `${count}+ professional ${topic} assets`, features: [`${count}+ Assets`, "High Resolution", "Multiple Formats", "Commercial License"] },
    ],
    "Business Courses": [
      { name: `${topic} — Complete Course`, short: `Step-by-step ${topic} course for entrepreneurs`, features: ["Video Lessons", "Templates", "Case Studies", "Action Plans"] },
    ],
    "Video Courses": [
      { name: `${topic} Video Course — Full`, short: `Complete ${topic} video course with lifetime access`, features: ["HD Video", "Downloads", "Exercises", "Lifetime Updates"] },
    ],
    "Language Courses": [
      { name: `${topic} — Complete Course`, short: `Learn ${topic} from beginner to fluent`, features: ["All Levels A1-C2", "Video Lessons", "Audio Practice", "Grammar Guide"] },
    ],
  };

  const t = templates[category]?.[0] || templates["eBooks & PLR"]![0];
  return {
    name: t.name,
    short_description: t.short,
    description: t.short,
    category,
    price,
    original_price: originalPrice,
    features: t.features,
    badge: Math.random() > 0.5 ? "جديد" : null,
    is_active: true,
  };
}

export function ProductCreateDialog({ open, onOpenChange, onProductCreated }: ProductCreateDialogProps) {
  const [mode, setMode] = useState<"choose" | "manual" | "auto">("choose");
  const [saving, setSaving] = useState(false);

  // Manual form state
  const [name, setName] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [badge, setBadge] = useState("");

  // Auto state
  const [autoCategory, setAutoCategory] = useState(CATEGORIES[0]);
  const [autoCount, setAutoCount] = useState("5");
  const [generatedProducts, setGeneratedProducts] = useState<ReturnType<typeof generateProduct>[]>([]);

  const reset = () => {
    setMode("choose");
    setName("");
    setShortDesc("");
    setPrice("");
    setOriginalPrice("");
    setCategory(CATEGORIES[0]);
    setBadge("");
    setGeneratedProducts([]);
    setAutoCount("5");
  };

  const handleManualSave = async () => {
    if (!name.trim() || !price) {
      toast.error("يرجى ملء الاسم والسعر");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("products").insert({
      name: name.trim(),
      short_description: shortDesc.trim() || null,
      price: Number(price),
      original_price: originalPrice ? Number(originalPrice) : null,
      category,
      badge: badge.trim() || null,
      is_active: true,
    });
    setSaving(false);
    if (error) {
      toast.error("فشل في إضافة المنتج");
      return;
    }
    toast.success("تم إضافة المنتج بنجاح");
    onProductCreated();
    reset();
    onOpenChange(false);
  };

  const handleGenerate = () => {
    const topics = SAMPLE_TOPICS[autoCategory] || SAMPLE_TOPICS["eBooks & PLR"]!;
    const count = Math.min(Math.max(parseInt(autoCount) || 1, 1), 50);
    const products: ReturnType<typeof generateProduct>[] = [];
    const usedTopics = new Set<string>();
    for (let i = 0; i < count; i++) {
      let topic: string;
      do {
        topic = topics[Math.floor(Math.random() * topics.length)];
      } while (usedTopics.has(topic) && usedTopics.size < topics.length);
      usedTopics.add(topic);
      products.push(generateProduct(autoCategory, topic));
    }
    setGeneratedProducts(products);
  };

  const handleAutoSave = async () => {
    if (generatedProducts.length === 0) return;
    setSaving(true);
    const { error } = await supabase.from("products").insert(generatedProducts);
    setSaving(false);
    if (error) {
      toast.error("فشل في حفظ المنتجات");
      return;
    }
    toast.success(`تم إضافة ${generatedProducts.length} منتج بنجاح`);
    onProductCreated();
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {mode === "choose" ? "إضافة منتجات" : mode === "manual" ? "إضافة يدوية" : "توليد تلقائي"}
          </DialogTitle>
        </DialogHeader>

        {mode === "choose" && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setMode("manual")}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group"
            >
              <PenLine className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
              <div className="text-center">
                <p className="font-semibold text-foreground text-sm">إضافة يدوية</p>
                <p className="text-xs text-muted-foreground mt-1">أدخل بيانات المنتج يدوياً</p>
              </div>
            </button>
            <button
              onClick={() => setMode("auto")}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group"
            >
              <Wand2 className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
              <div className="text-center">
                <p className="font-semibold text-foreground text-sm">توليد تلقائي</p>
                <p className="text-xs text-muted-foreground mt-1">توليد منتجات عشوائية حسب التصنيف</p>
              </div>
            </button>
          </div>
        )}

        {mode === "manual" && (
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">اسم المنتج *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: كتاب التسويق الرقمي" className="bg-card" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">وصف قصير</label>
              <Input value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} placeholder="وصف مختصر للمنتج" className="bg-card" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">السعر *</label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="29" className="bg-card" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">السعر الأصلي</label>
                <Input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="59" className="bg-card" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">التصنيف</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">الأيقونة (اختياري)</label>
              <Input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="مثال: جديد، خصم" className="bg-card" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleManualSave} disabled={saving} className="flex-1 gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                حفظ المنتج
              </Button>
              <Button variant="outline" onClick={() => setMode("choose")}>رجوع</Button>
            </div>
          </div>
        )}

        {mode === "auto" && (
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">التصنيف</label>
              <select
                value={autoCategory}
                onChange={(e) => { setAutoCategory(e.target.value); setGeneratedProducts([]); }}
                className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">عدد المنتجات (1-50)</label>
              <Input type="number" min={1} max={50} value={autoCount} onChange={(e) => setAutoCount(e.target.value)} className="bg-card" />
            </div>
            <Button onClick={handleGenerate} variant="outline" className="w-full gap-1.5">
              <RefreshCw className="w-4 h-4" />
              توليد المنتجات
            </Button>

            {generatedProducts.length > 0 && (
              <div className="space-y-2 max-h-52 overflow-y-auto border border-border rounded-lg p-2">
                {generatedProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-xs">
                    <span className="truncate flex-1 text-foreground">{p.name}</span>
                    <span className="text-primary font-semibold mr-2">${p.price}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleAutoSave} disabled={saving || generatedProducts.length === 0} className="flex-1 gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                حفظ {generatedProducts.length} منتج
              </Button>
              <Button variant="outline" onClick={() => setMode("choose")}>رجوع</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
