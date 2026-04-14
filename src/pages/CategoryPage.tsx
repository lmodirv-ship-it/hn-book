import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
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
import { mapProductRowToProduct } from "@/lib/product-utils";

const ITEMS_PER_PAGE = 100;

const CATEGORY_LABELS: Record<string, string> = {
  "كتب": "كتب",
  "بطاقات": "بطاقات",
  "قوالب": "قوالب",
  "صور": "صور",
  "وثائق": "وثائق",
  "أخرى": "أخرى",
};

type SortOption = "newest" | "oldest" | "price_asc" | "price_desc" | "name_asc";
type LangCode = "all" | "ar" | "fr" | "en";

const SORT_OPTIONS: { code: SortOption; label: string; icon: string }[] = [
  { code: "newest", label: "الأحدث", icon: "🕐" },
  { code: "oldest", label: "الأقدم", icon: "📅" },
  { code: "price_asc", label: "الأقل سعراً", icon: "💰" },
  { code: "price_desc", label: "الأغلى سعراً", icon: "💎" },
  { code: "name_asc", label: "أبجدياً", icon: "🔤" },
];

const LANGUAGES = [
  { code: "all" as LangCode, label: "الكل", flag: "🌍" },
  { code: "ar" as LangCode, label: "العربية", flag: "🇸🇦" },
  { code: "fr" as LangCode, label: "Français", flag: "🇫🇷" },
  { code: "en" as LangCode, label: "English", flag: "🇬🇧" },
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
  "Arabic literature": "ar",
  "Literature": "en",
  "Philosophy": "en",
  "Biography & Autobiography": "en",
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
  "Arabic literature": { label: "أدب عربي كلاسيكي", icon: "📖" },
  "Literature": { label: "Literature", icon: "📕" },
  "Philosophy": { label: "Philosophy", icon: "🤔" },
  "Biography & Autobiography": { label: "Biography", icon: "👤" },
};

const CategoryPage = () => {
  const { category } = useParams<{ category: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedLang, setSelectedLang] = useState<LangCode>("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");

  const categoryName = category ? decodeURIComponent(category) : "";
  const categoryLabel = CATEGORY_LABELS[categoryName] || categoryName;

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("category", categoryName)
        .not("pdf_url", "is", null)
        .neq("pdf_url", "")
        .order("created_at", { ascending: false });

      if (data) {
        const mapped: Product[] = data.map(mapProductRowToProduct);
        setProducts(mapped);
      }
      setLoading(false);
    };
    fetchProducts();
  }, [categoryName]);

  // Available subcategories for selected language
  const availableSubCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      const lang = CATEGORY_LANG_MAP[p.category] || "en";
      if (selectedLang === "all" || lang === selectedLang) {
        cats.add(p.category);
      }
    });
    return Array.from(cats).sort();
  }, [products, selectedLang]);

  // Language counts
  const langCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const lang = CATEGORY_LANG_MAP[p.category] || "en";
      counts[lang] = (counts[lang] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Subcategory counts
  const subCatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const lang = CATEGORY_LANG_MAP[p.category] || "en";
      if (selectedLang === "all" || lang === selectedLang) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    return counts;
  }, [products, selectedLang]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Language filter
    if (selectedLang !== "all") {
      result = result.filter(p => {
        const lang = CATEGORY_LANG_MAP[p.category] || "en";
        return lang === selectedLang;
      });
    }

    // Subcategory filter
    if (selectedSubCategory !== "all") {
      result = result.filter(p => p.category === selectedSubCategory);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case "oldest":
        result.reverse();
        break;
      case "price_asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "name_asc":
        result.sort((a, b) => a.name.localeCompare(b.name, "ar"));
        break;
    }

    return result;
  }, [searchQuery, products, sortBy, selectedLang, selectedSubCategory]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  const btnActive = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_-3px_rgba(16,185,129,0.4)]";
  const btnInactive = "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white";

  return (
    <div className="relative min-h-screen noise-bg" dir="rtl">
      <ParticleCanvas />
      <div className="relative z-10 pt-14">
        <Navbar
          categories={[]}
          activeCategory={categoryName}
          onCategorySelect={() => {}}
          productCounts={{}}
        />

        <section className="relative py-8 sm:py-12">
          <div className="container mx-auto px-4">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                {categoryLabel}
              </h1>
              <p className="text-sm text-muted-foreground">
                {filteredProducts.length} منتج
              </p>
            </div>

            {/* Filters */}
            <div className="space-y-3 mb-8">
              {/* Language Row */}
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
                      setSelectedSubCategory("all");
                      setVisibleCount(ITEMS_PER_PAGE);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      selectedLang === lang.code ? btnActive : btnInactive
                    }`}
                  >
                    <span className="text-sm">{lang.flag}</span>
                    {lang.label}
                    {lang.code !== "all" && langCounts[lang.code] ? (
                      <span className="text-[10px] opacity-60">({langCounts[lang.code]})</span>
                    ) : null}
                  </button>
                ))}
              </div>

              {/* Subcategory Row */}
              <AnimatePresence>
                {selectedLang !== "all" && availableSubCategories.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center gap-2 pr-6 border-r-2 border-emerald-500/30">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5 ml-2">
                        <BookOpen className="w-3.5 h-3.5" />
                        التخصص:
                      </span>
                      <button
                        onClick={() => { setSelectedSubCategory("all"); setVisibleCount(ITEMS_PER_PAGE); }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                          selectedSubCategory === "all" ? btnActive : btnInactive
                        }`}
                      >
                        الكل
                      </button>
                      {availableSubCategories.map((cat) => {
                        const display = CATEGORY_DISPLAY[cat] || { label: cat, icon: "📄" };
                        const count = subCatCounts[cat] || 0;
                        return (
                          <button
                            key={cat}
                            onClick={() => { setSelectedSubCategory(cat); setVisibleCount(ITEMS_PER_PAGE); }}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                              selectedSubCategory === cat ? btnActive : btnInactive
                            }`}
                          >
                            <span className="text-sm">{display.icon}</span>
                            {display.label}
                            <span className="text-[10px] opacity-60">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

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
                      sortBy === opt.code ? btnActive : btnInactive
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
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(ITEMS_PER_PAGE);
                  }}
                  className="pl-10 rounded-xl bg-card/30 border-border/20 focus:border-primary/30 transition-colors"
                />
              </div>
            </div>

            {loading ? (
              <div className="mt-20 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                <span className="text-sm text-muted-foreground/50">جاري التحميل...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="mt-20 text-center text-muted-foreground">
                لا توجد منتجات مطابقة
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
                      تحميل المزيد
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

export default CategoryPage;
