import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ParticleCanvas from "@/components/ParticleCanvas";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import Footer from "@/components/Footer";
import type { Product } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, Loader2, Globe, BookOpen, ArrowUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type SortOption = "newest" | "price_asc" | "price_desc" | "name" | "bestseller";

const SORT_OPTIONS: { code: SortOption; label: string; icon: string }[] = [
  { code: "newest", label: "الأحدث", icon: "🕐" },
  { code: "price_asc", label: "الأقل سعراً", icon: "💰" },
  { code: "price_desc", label: "الأغلى سعراً", icon: "💎" },
  { code: "name", label: "أبجدياً", icon: "🔤" },
  { code: "bestseller", label: "الأكثر مبيعاً", icon: "⭐" },
];

const ITEMS_PER_PAGE = 60;

// Language definitions with icons
const LANGUAGES = [
  { code: "all", label: "الكل", flag: "🌍" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
] as const;

type LangCode = "all" | "ar" | "fr" | "en";

// Map categories to languages
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
  "Arabic literature": "ar",
  "Literature": "en",
  "Philosophy": "en",
  "Biography & Autobiography": "en",
};

// Category display labels with icons
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
  "Arabic literature": { label: "أدب عربي كلاسيكي", icon: "📖" },
  "Literature": { label: "Literature", icon: "📕" },
  "Philosophy": { label: "Philosophy", icon: "🤔" },
  "Biography & Autobiography": { label: "Biography", icon: "👤" },
};

// Country to language mapping
const COUNTRY_LANG: Record<string, LangCode> = {
  // Arabic countries
  SA: "ar", AE: "ar", EG: "ar", MA: "ar", DZ: "ar", TN: "ar",
  LY: "ar", IQ: "ar", SY: "ar", JO: "ar", LB: "ar", KW: "ar",
  QA: "ar", BH: "ar", OM: "ar", YE: "ar", SD: "ar", MR: "ar",
  PS: "ar", DJ: "ar", SO: "ar", KM: "ar",
  // French countries
  FR: "fr", BE: "fr", CH: "fr", CA: "fr", SN: "fr", CI: "fr",
  ML: "fr", BF: "fr", NE: "fr", TD: "fr", CM: "fr", GA: "fr",
  CG: "fr", CD: "fr", MG: "fr", HT: "fr", MC: "fr", LU: "fr",
  // English default for rest
};

function detectLanguage(): LangCode {
  // Try navigator language
  const navLang = navigator.language?.toLowerCase() || "";
  if (navLang.startsWith("ar")) return "ar";
  if (navLang.startsWith("fr")) return "fr";
  if (navLang.startsWith("en")) return "en";
  return "ar"; // Default to Arabic
}

const BooksPage = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLang, setSelectedLang] = useState<LangCode>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [detectedLang, setDetectedLang] = useState<LangCode>("ar");

  // Auto-detect language on mount
  useEffect(() => {
    const detected = detectLanguage();
    setDetectedLang(detected);
    setSelectedLang(detected);

    // Also try IP-based detection
    fetch("https://ipapi.co/json/")
      .then(r => r.json())
      .then(data => {
        if (data?.country_code) {
          const countryLang = COUNTRY_LANG[data.country_code] || "en";
          setDetectedLang(countryLang);
          setSelectedLang(countryLang);
        }
      })
      .catch(() => {}); // Silently fail
  }, []);

  // Fetch all books
  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (data) {
        const mapped: Product[] = data.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description || "",
          shortDescription: p.short_description || "",
          price: Number(p.price),
          originalPrice: p.original_price ? Number(p.original_price) : undefined,
          category: p.category,
          image: p.image || "",
          features: p.features || [],
          badge: p.badge || undefined,
          isFlashDeal: p.is_flash_deal || false,
          dealEndsIn: p.deal_ends_in || undefined,
          referenceCode: (p as any).reference_code || undefined,
          pdfUrl: p.pdf_url || undefined,
        }));
        setAllProducts(mapped);
      }
      setLoading(false);
    };
    fetchBooks();
  }, []);

  // Get available categories for current language
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    allProducts.forEach(p => {
      const lang = CATEGORY_LANG_MAP[p.category] || "en";
      if (selectedLang === "all" || lang === selectedLang) {
        cats.add(p.category);
      }
    });
    return Array.from(cats).sort();
  }, [allProducts, selectedLang]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = allProducts;

    // Language filter
    if (selectedLang !== "all") {
      result = result.filter(p => {
        const lang = CATEGORY_LANG_MAP[p.category] || "en";
        return lang === selectedLang;
      });
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allProducts, selectedLang, selectedCategory, searchQuery]);

  // Sort products
  const sortedProducts = useMemo(() => {
    const result = [...filteredProducts];
    switch (sortBy) {
      case "price_asc": return result.sort((a, b) => a.price - b.price);
      case "price_desc": return result.sort((a, b) => b.price - a.price);
      case "name": return result.sort((a, b) => a.name.localeCompare(b.name, "ar"));
      case "bestseller": return result.sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0));
      default: return result; // newest - already sorted by created_at desc
    }
  }, [filteredProducts, sortBy]);

  const visibleProducts = sortedProducts.slice(0, visibleCount);
  const hasMore = visibleCount < sortedProducts.length;

  // Category counts
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

  return (
    <div className="relative min-h-screen noise-bg" dir="rtl">
      <ParticleCanvas />
      <div className="relative z-10 pt-14">
        <Navbar
          categories={[]}
          activeCategory=""
          onCategorySelect={() => {}}
          productCounts={{}}
        />

        <section className="relative py-8 sm:py-12">
          <div className="container mx-auto px-4">
            {/* Page Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm">
                <BookOpen className="w-4 h-4" />
                مكتبة HN Book
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                اكتشف آلاف الكتب
              </h1>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                اختر اللغة والتخصص واستمتع بالقراءة
              </p>
            </div>

            {/* Filters Section */}
            <div className="space-y-3 mb-8">
              {/* Language Filter Row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 ml-2">
                  <Globe className="w-3.5 h-3.5" />
                  اللغة:
                </span>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setSelectedLang(lang.code);
                      setSelectedCategory("all");
                      setVisibleCount(ITEMS_PER_PAGE);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      selectedLang === lang.code
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_-3px_rgba(16,185,129,0.4)]"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="text-sm">{lang.flag}</span>
                    {lang.label}
                    {lang.code !== "all" && (
                      <span className="text-[10px] opacity-60">
                        ({allProducts.filter(p => (CATEGORY_LANG_MAP[p.category] || "en") === lang.code).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Category Filter Row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 ml-2">
                  <BookOpen className="w-3.5 h-3.5" />
                  التخصص:
                </span>
                <button
                  onClick={() => { setSelectedCategory("all"); setVisibleCount(ITEMS_PER_PAGE); }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    selectedCategory === "all"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_-3px_rgba(16,185,129,0.4)]"
                      : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  الكل ({filteredProducts.length})
                </button>
                {availableCategories.map((cat) => {
                  const display = CATEGORY_DISPLAY[cat] || { label: cat, icon: "📄" };
                  const count = categoryCounts[cat] || 0;
                  return (
                    <button
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); setVisibleCount(ITEMS_PER_PAGE); }}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                        selectedCategory === cat
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_-3px_rgba(16,185,129,0.4)]"
                          : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="text-sm">{display.icon}</span>
                      {display.label}
                      <span className="text-[10px] opacity-60">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Sort Row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 ml-2">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  الفرز:
                </span>
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    onClick={() => setSortBy(opt.code)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      sortBy === opt.code
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_-3px_rgba(16,185,129,0.4)]"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="text-sm">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  placeholder="ابحث عن كتاب..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(ITEMS_PER_PAGE);
                  }}
                  className="pl-10 rounded-xl bg-card/30 border-border/20 focus:border-primary/30 transition-colors"
                />
              </div>

              {/* Results count */}
              <p className="text-xs text-muted-foreground">
                {filteredProducts.length} كتاب
              </p>
            </div>

            {/* Books Grid */}
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
                      تحميل المزيد ({sortedProducts.length - visibleCount} كتاب متبقي)
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
