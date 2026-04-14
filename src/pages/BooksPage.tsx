import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ParticleCanvas from "@/components/ParticleCanvas";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import Footer from "@/components/Footer";
import type { Product } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, Loader2, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mapProductRowToProduct } from "@/lib/product-utils";

const ITEMS_PER_PAGE = 60;

type LangCode = "all" | "ar" | "fr" | "en";

const LANGUAGES = [
  { code: "all" as LangCode, label: "الكل", flag: "🌍" },
  { code: "ar" as LangCode, label: "العربية", flag: "🇸🇦" },
  { code: "fr" as LangCode, label: "Français", flag: "🇫🇷" },
  { code: "en" as LangCode, label: "English", flag: "🇬🇧" },
];

const SUBCATEGORIES: string[] = [
  "التاريخ", "العلوم", "الطب", "الأدب العربي", "الدين الإسلامي",
  "تطوير الذات", "الفلسفة والفكر", "اللغة العربية", "الاقتصاد والمال",
  "التكنولوجيا", "كتب", "Arabic literature", "Literature", "Philosophy",
  "Biography & Autobiography", "Photography", "مطبخ الدار",
];

const CATEGORY_LANG_MAP: Record<string, LangCode> = {
  "التاريخ": "ar",
  "العلوم": "ar",
  "الطب": "ar",
  "الأدب العربي": "ar",
  "الدين الإسلامي": "ar",
  "تطوير الذات": "ar",
  "الفلسفة والفكر": "ar",
  "اللغة العربية": "ar",
  "الاقتصاد والمال": "ar",
  "التكنولوجيا": "ar",
  "كتب": "ar",
  "مطبخ الدار": "ar",
  "Arabic literature": "ar",
  "Literature": "en",
  "Philosophy": "en",
  "Biography & Autobiography": "en",
  "Photography": "en",
};

const CATEGORY_DISPLAY: Record<string, { label: string; icon: string }> = {
  "التاريخ": { label: "التاريخ", icon: "🏛️" },
  "العلوم": { label: "العلوم", icon: "🔬" },
  "الطب": { label: "الطب", icon: "🏥" },
  "الأدب العربي": { label: "الأدب", icon: "📜" },
  "الدين الإسلامي": { label: "الدين", icon: "🕌" },
  "تطوير الذات": { label: "تطوير الذات", icon: "🧠" },
  "الفلسفة والفكر": { label: "الفلسفة", icon: "💭" },
  "اللغة العربية": { label: "اللغة العربية", icon: "✍️" },
  "الاقتصاد والمال": { label: "الاقتصاد", icon: "💰" },
  "التكنولوجيا": { label: "التكنولوجيا", icon: "💻" },
  "كتب": { label: "كتب عامة", icon: "📚" },
  "مطبخ الدار": { label: "مطبخ الدار", icon: "🍳" },
  "Arabic literature": { label: "أدب عربي كلاسيكي", icon: "📖" },
  "Literature": { label: "Literature", icon: "📕" },
  "Philosophy": { label: "Philosophy", icon: "🤔" },
  "Biography & Autobiography": { label: "Biography", icon: "👤" },
  "Photography": { label: "Photography", icon: "📷" },
};

const COUNTRY_LANG: Record<string, LangCode> = {
  SA: "ar", AE: "ar", EG: "ar", MA: "ar", DZ: "ar", TN: "ar",
  LY: "ar", IQ: "ar", SY: "ar", JO: "ar", LB: "ar", KW: "ar",
  QA: "ar", BH: "ar", OM: "ar", YE: "ar", SD: "ar", MR: "ar",
  PS: "ar", DJ: "ar", SO: "ar", KM: "ar",
  FR: "fr", BE: "fr", CH: "fr", CA: "fr", SN: "fr", CI: "fr",
  ML: "fr", BF: "fr", NE: "fr", TD: "fr", CM: "fr", GA: "fr",
  CG: "fr", CD: "fr", MG: "fr", HT: "fr", MC: "fr", LU: "fr",
};

function detectLanguage(): LangCode {
  const navLang = navigator.language?.toLowerCase() || "";
  if (navLang.startsWith("ar")) return "ar";
  if (navLang.startsWith("fr")) return "fr";
  if (navLang.startsWith("en")) return "en";
  return "ar";
}

const glowAnim = {
  boxShadow: [
    "inset 0 0 8px -2px hsl(199,89%,48%,0.3), 0 0 10px -2px hsl(199,89%,48%,0.2)",
    "inset 0 0 20px -2px hsl(199,89%,48%,0.7), 0 0 25px -2px hsl(199,89%,48%,0.5)",
    "inset 0 0 8px -2px hsl(199,89%,48%,0.3), 0 0 10px -2px hsl(199,89%,48%,0.2)",
  ],
  borderColor: [
    "hsl(199,89%,48%,0.4)",
    "hsl(199,89%,48%,0.8)",
    "hsl(199,89%,48%,0.4)",
  ],
};
const glowAnimActive = {
  boxShadow: [
    "inset 0 0 15px -2px rgba(16,185,129,0.5), 0 0 20px -2px rgba(16,185,129,0.4)",
    "inset 0 0 25px -2px rgba(16,185,129,0.85), 0 0 35px -2px rgba(16,185,129,0.65)",
    "inset 0 0 15px -2px rgba(16,185,129,0.5), 0 0 20px -2px rgba(16,185,129,0.4)",
  ],
  borderColor: [
    "rgba(16,185,129,0.5)",
    "rgba(16,185,129,0.9)",
    "rgba(16,185,129,0.5)",
  ],
};
const glowHover = {
  boxShadow: "inset 0 0 25px -2px hsl(199,89%,48%,0.85), 0 0 35px -2px hsl(199,89%,48%,0.6)",
  borderColor: "hsl(199,89%,48%,0.9)",
  scale: 1.05,
};
const btnBase = "rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white border backdrop-blur-sm";

const BooksPage = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLang, setSelectedLang] = useState<LangCode>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    const detected = detectLanguage();
    setSelectedLang(detected);
    fetch("https://ipapi.co/json/")
      .then(r => r.json())
      .then(data => {
        if (data?.country_code) {
          const countryLang = COUNTRY_LANG[data.country_code] || "en";
          setSelectedLang(countryLang);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .not("pdf_url", "is", null)
        .neq("pdf_url", "")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (data) setAllProducts(data.map(mapProductRowToProduct));
      setLoading(false);
    };
    fetchBooks();
  }, []);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    allProducts.forEach(p => {
      const lang = CATEGORY_LANG_MAP[p.category] || "en";
      if (selectedLang === "all" || lang === selectedLang) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [allProducts, selectedLang]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allProducts.forEach(p => {
      const lang = CATEGORY_LANG_MAP[p.category] || "en";
      if (selectedLang === "all" || lang === selectedLang) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    return counts;
  }, [allProducts, selectedLang]);

  const filteredProducts = useMemo(() => {
    let result = allProducts;
    if (selectedLang !== "all") {
      result = result.filter(p => (CATEGORY_LANG_MAP[p.category] || "en") === selectedLang);
    }
    if (selectedCategory !== "all") {
      result = result.filter(p => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) || p.shortDescription.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allProducts, selectedLang, selectedCategory, searchQuery]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  return (
    <div className="relative min-h-screen noise-bg" dir="rtl">
      <ParticleCanvas />
      <div className="relative z-10 pt-14">
        <Navbar categories={[]} activeCategory="" onCategorySelect={() => {}} productCounts={{}} />

        <section className="relative py-8 sm:py-12">
          <div className="container mx-auto px-4">
            {/* Filters */}
            <div className="space-y-3 mb-8">
              {/* Language Row */}
              <div className="flex items-center gap-1 rounded-xl px-1.5 py-1 bg-primary/10 border border-primary/30 shadow-[0_0_25px_-3px_hsl(199,89%,48%,0.2),inset_0_0_15px_-3px_hsl(199,89%,48%,0.1)] w-fit">
                {LANGUAGES.map((lang, idx) => {
                  const isActive = selectedLang === lang.code;
                  return (
                    <motion.button
                      key={lang.code}
                      onClick={() => {
                        setSelectedLang(lang.code);
                        setSelectedCategory("all");
                        setVisibleCount(ITEMS_PER_PAGE);
                      }}
                      className={`${btnBase} ${isActive ? "border-emerald-500/50 bg-emerald-500/20" : "border-primary/50 bg-primary/20"}`}
                      animate={isActive ? glowAnimActive : glowAnim}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: idx * 0.3 }}
                      whileHover={glowHover}
                    >
                      <span className="text-sm">{lang.flag}</span>{" "}
                      {lang.label}
                      {lang.code !== "all" && (
                        <span className="text-[10px] opacity-60 ml-1">
                          ({allProducts.filter(p => (CATEGORY_LANG_MAP[p.category] || "en") === lang.code).length})
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence>
                {selectedLang !== "all" && availableCategories.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-1 rounded-xl px-1.5 py-1 bg-primary/10 border border-primary/30 shadow-[0_0_25px_-3px_hsl(199,89%,48%,0.2),inset_0_0_15px_-3px_hsl(199,89%,48%,0.1)] w-fit mr-6 border-r-2 border-r-emerald-500/30">
                      <motion.button
                        onClick={() => { setSelectedCategory("all"); setVisibleCount(ITEMS_PER_PAGE); }}
                        className={`${btnBase} ${selectedCategory === "all" ? "border-emerald-500/50 bg-emerald-500/20" : "border-primary/50 bg-primary/20"}`}
                        animate={selectedCategory === "all" ? glowAnimActive : glowAnim}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        whileHover={glowHover}
                      >
                        الكل ({filteredProducts.length})
                      </motion.button>
                      {availableCategories.map((cat, idx) => {
                        const display = CATEGORY_DISPLAY[cat] || { label: cat, icon: "📄" };
                        const isActive = selectedCategory === cat;
                        return (
                          <motion.button
                            key={cat}
                            onClick={() => { setSelectedCategory(cat); setVisibleCount(ITEMS_PER_PAGE); }}
                            className={`${btnBase} ${isActive ? "border-emerald-500/50 bg-emerald-500/20" : "border-primary/50 bg-primary/20"}`}
                            animate={isActive ? glowAnimActive : glowAnim}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: idx * 0.2 }}
                            whileHover={glowHover}
                          >
                            <span className="text-sm">{display.icon}</span>{" "}
                            {display.label}
                            <span className="text-[10px] opacity-60 ml-1">({categoryCounts[cat] || 0})</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  placeholder="ابحث عن كتاب..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
                  className="pl-10 rounded-xl bg-card/30 border-border/20 focus:border-primary/30 transition-colors"
                />
              </div>

              <p className="text-xs text-muted-foreground">{filteredProducts.length} كتاب</p>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="mt-20 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                <span className="text-sm text-muted-foreground/50">جاري التحميل...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="mt-20 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد كتب مطابقة</p>
              </div>
            ) : (
              <>
                <div className="grid gap-0 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 bg-black/90 rounded-2xl p-2 border border-white/5 shadow-[inset_0_0_30px_-10px_rgba(0,0,0,0.8)]">
                  {visibleProducts.map((product, i) => (
                    <ProductCard key={product.id} product={product} index={i % ITEMS_PER_PAGE} />
                  ))}
                </div>
                {hasMore && (
                  <div className="mt-12 text-center">
                    <Button
                      variant="outline"
                      onClick={() => setVisibleCount((p) => p + ITEMS_PER_PAGE)}
                      className="gap-2 rounded-full px-8 py-5 border-border/20 hover:border-primary/20 hover:bg-card/40 transition-all"
                    >
                      <ChevronDown className="h-4 w-4" />
                      تحميل المزيد ({filteredProducts.length - visibleCount} كتاب متبقي)
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
        <Footer />
      </div>
    </div>
  );
};

export default BooksPage;
