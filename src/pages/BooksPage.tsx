import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ParticleCanvas from "@/components/ParticleCanvas";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import Footer from "@/components/Footer";
import type { Product } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronDown, BookOpen, Loader2 } from "lucide-react";
import { bookService } from "@/services";

const ITEMS_PER_PAGE = 24;
const BACKGROUND_BATCH_SIZE = 200;

type LangCode = "all" | "ar" | "fr" | "en";

const LANGUAGES = [
  { code: "all" as LangCode, label: "الكل", flag: "🌍" },
  { code: "ar" as LangCode, label: "العربية", flag: "🇸🇦" },
  { code: "fr" as LangCode, label: "Français", flag: "🇫🇷" },
  { code: "en" as LangCode, label: "English", flag: "🇬🇧" },
];

const CATEGORY_LANG_MAP: Record<string, LangCode> = {
  "التاريخ": "ar", "العلوم": "ar", "الطب": "ar", "الأدب العربي": "ar",
  "الدين الإسلامي": "ar", "تطوير الذات": "ar", "الفلسفة والفكر": "ar",
  "اللغة العربية": "ar", "الاقتصاد والمال": "ar", "التكنولوجيا": "ar",
  "كتب": "ar", "مطبخ الدار": "ar", "Arabic literature": "ar",
  "Literature": "en", "Philosophy": "en", "Biography & Autobiography": "en",
  "Photography": "en",
};

const CATEGORY_DISPLAY: Record<string, { label: string; icon: string }> = {
  "التاريخ": { label: "التاريخ", icon: "🏛️" }, "العلوم": { label: "العلوم", icon: "🔬" },
  "الطب": { label: "الطب", icon: "🏥" }, "الأدب العربي": { label: "الأدب", icon: "📜" },
  "الدين الإسلامي": { label: "الدين", icon: "🕌" }, "تطوير الذات": { label: "تطوير الذات", icon: "🧠" },
  "الفلسفة والفكر": { label: "الفلسفة", icon: "💭" }, "اللغة العربية": { label: "اللغة العربية", icon: "✍️" },
  "الاقتصاد والمال": { label: "الاقتصاد", icon: "💰" }, "التكنولوجيا": { label: "التكنولوجيا", icon: "💻" },
  "كتب": { label: "كتب عامة", icon: "📚" }, "مطبخ الدار": { label: "مطبخ الدار", icon: "🍳" },
  "Arabic literature": { label: "أدب عربي كلاسيكي", icon: "📖" }, "Literature": { label: "Literature", icon: "📕" },
  "Philosophy": { label: "Philosophy", icon: "🤔" }, "Biography & Autobiography": { label: "Biography", icon: "👤" },
  "Photography": { label: "Photography", icon: "📷" },
};

function detectLanguage(): LangCode {
  const navLang = navigator.language?.toLowerCase() || "";
  if (navLang.startsWith("ar")) return "ar";
  if (navLang.startsWith("fr")) return "fr";
  if (navLang.startsWith("en")) return "en";
  return "ar";
}

const getFilterButtonClass = (active: boolean) =>
  `rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white border transition-all duration-200 hover:scale-105 ${
    active
      ? "border-emerald-500/50 bg-emerald-500/20 shadow-[0_0_18px_-5px_rgba(16,185,129,0.4)]"
      : "border-primary/50 bg-primary/20 shadow-[0_0_16px_-6px_hsl(199,89%,48%,0.25)] hover:border-primary/80"
  }`;

const mapBook = (b: any): Product => ({
  id: b.id, name: b.name, description: b.description, shortDescription: b.shortDescription,
  price: b.price, originalPrice: b.originalPrice, category: b.category, image: b.image,
  features: b.features, badge: b.badge, isFlashDeal: b.isFlashDeal, dealEndsIn: b.dealEndsIn,
  referenceCode: b.referenceCode, pdfUrl: b.pdfUrl,
});

/* ── Skeleton Card ── */
const SkeletonCard = () => (
  <div className="p-2 space-y-2">
    <Skeleton className="aspect-[4/5] w-full rounded-xl" />
    <Skeleton className="h-3 w-1/3" />
    <Skeleton className="h-4 w-4/5" />
    <Skeleton className="h-3 w-2/3" />
    <div className="flex justify-between pt-1">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  </div>
);

const BooksPage = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const [selectedLang, setSelectedLang] = useState<LangCode>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    setSelectedLang(detectLanguage());
  }, []);

  // Phase 1: fast initial fetch
  useEffect(() => {
    let cancelled = false;
    const fetchInitial = async () => {
      try {
        setInitialLoading(true);
        console.log("[BooksPage] Phase 1: fetching initial books...");
        const result = await bookService.getAll({ limit: ITEMS_PER_PAGE });
        console.log("[BooksPage] Phase 1 result:", { dataLen: result.data?.length, error: result.error });
        if (!cancelled && result.data) {
          setAllProducts(result.data.map(mapBook));
        }
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    };
    fetchInitial();
    return () => { cancelled = true; };
  }, []);

  // Phase 2: background fetch remaining
  useEffect(() => {
    if (initialLoading) return;
    let cancelled = false;

    const fetchRemaining = async () => {
      let offset = ITEMS_PER_PAGE;
      while (!cancelled) {
        const result = await bookService.getAll({ limit: BACKGROUND_BATCH_SIZE, offset });
        if (cancelled) break;
        if (!result.data || result.data.length === 0) {
          setAllLoaded(true);
          break;
        }
        const mapped = result.data.map(mapBook);
        setAllProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = mapped.filter(m => !existingIds.has(m.id));
          return newItems.length > 0 ? [...prev, ...newItems] : prev;
        });
        if (result.data.length < BACKGROUND_BATCH_SIZE) {
          setAllLoaded(true);
          break;
        }
        offset += BACKGROUND_BATCH_SIZE;
      }
    };
    fetchRemaining();
    return () => { cancelled = true; };
  }, [initialLoading]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    allProducts.forEach((p) => {
      const lang = CATEGORY_LANG_MAP[p.category] || "en";
      if (selectedLang === "all" || lang === selectedLang) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [allProducts, selectedLang]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allProducts.forEach((p) => {
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
      result = result.filter((p) => (CATEGORY_LANG_MAP[p.category] || "en") === selectedLang);
    }
    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.shortDescription.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allProducts, selectedLang, selectedCategory, searchQuery]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((p) => p + ITEMS_PER_PAGE);
  }, []);

  return (
    <div className="relative min-h-screen noise-bg" dir="rtl">
      <ParticleCanvas />
      <div className="relative z-10 pt-14">
        <Navbar categories={[]} activeCategory="" onCategorySelect={() => {}} productCounts={{}} />

        <section className="relative py-8 sm:py-12">
          <div className="container mx-auto px-4">
            <div className="space-y-3 mb-8">
              {/* Language filter */}
              <div className="flex items-center gap-1 rounded-xl px-1.5 py-1 bg-primary/10 border border-primary/30 shadow-[0_0_25px_-3px_hsl(199,89%,48%,0.2),inset_0_0_15px_-3px_hsl(199,89%,48%,0.1)] w-fit">
                {LANGUAGES.map((lang) => {
                  const isActive = selectedLang === lang.code;
                  const count = lang.code === "all"
                    ? allProducts.length
                    : allProducts.filter((p) => (CATEGORY_LANG_MAP[p.category] || "en") === lang.code).length;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => { setSelectedLang(lang.code); setSelectedCategory("all"); setVisibleCount(ITEMS_PER_PAGE); }}
                      className={getFilterButtonClass(isActive)}
                    >
                      <span className="text-sm">{lang.flag}</span> {lang.label}
                      <span className="text-[10px] opacity-60 ml-1">({count}){!allLoaded && "+"}</span>
                    </button>
                  );
                })}
              </div>

              {/* Category filter */}
              <AnimatePresence>
                {selectedLang !== "all" && availableCategories.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="flex flex-wrap items-center gap-1 rounded-xl px-1.5 py-1 bg-primary/10 border border-primary/30 shadow-[0_0_25px_-3px_hsl(199,89%,48%,0.2),inset_0_0_15px_-3px_hsl(199,89%,48%,0.1)] w-fit mr-6 border-r-2 border-r-emerald-500/30">
                      <button onClick={() => { setSelectedCategory("all"); setVisibleCount(ITEMS_PER_PAGE); }} className={getFilterButtonClass(selectedCategory === "all")}>
                        الكل ({filteredProducts.length})
                      </button>
                      {availableCategories.map((cat) => {
                        const display = CATEGORY_DISPLAY[cat] || { label: cat, icon: "📄" };
                        return (
                          <button key={cat} onClick={() => { setSelectedCategory(cat); setVisibleCount(ITEMS_PER_PAGE); }} className={getFilterButtonClass(selectedCategory === cat)}>
                            <span className="text-sm">{display.icon}</span> {display.label}
                            <span className="text-[10px] opacity-60 ml-1">({categoryCounts[cat] || 0})</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input placeholder="ابحث عن كتاب..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }} className="pl-10 rounded-xl bg-card/30 border-border/20 focus:border-primary/30 transition-colors" />
              </div>

              <p className="text-xs text-muted-foreground">
                {filteredProducts.length} كتاب{!allLoaded && " (جاري تحميل المزيد...)"}
              </p>
            </div>

            {/* Content */}
            {initialLoading ? (
              <div className="grid gap-0 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 bg-black/90 rounded-2xl p-2 border border-white/5 shadow-[inset_0_0_30px_-10px_rgba(0,0,0,0.8)]">
                {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
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
                    <Button variant="outline" onClick={handleLoadMore} className="gap-2 rounded-full px-8 py-5 border-border/20 hover:border-primary/20 hover:bg-card/40 transition-all">
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
