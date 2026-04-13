import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import ParticleCanvas from "@/components/ParticleCanvas";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import Footer from "@/components/Footer";
import type { Product } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, Loader2, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
type PriceFilter = "all" | "free" | "paid" | "under50" | "under100";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "الأحدث",
  oldest: "الأقدم",
  price_asc: "السعر: من الأقل",
  price_desc: "السعر: من الأعلى",
  name_asc: "الاسم أ-ي",
};

const PRICE_LABELS: Record<PriceFilter, string> = {
  all: "الكل",
  free: "مجاني",
  paid: "مدفوع",
  under50: "أقل من 50 د.م",
  under100: "أقل من 100 د.م",
};

const CategoryPage = () => {
  const { category } = useParams<{ category: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

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
        .order("created_at", { ascending: false });

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
        setProducts(mapped);
      }
      setLoading(false);
    };
    fetchProducts();
  }, [categoryName]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q)
      );
    }

    // Price filter
    switch (priceFilter) {
      case "free":
        result = result.filter((p) => p.price === 0);
        break;
      case "paid":
        result = result.filter((p) => p.price > 0);
        break;
      case "under50":
        result = result.filter((p) => p.price < 50);
        break;
      case "under100":
        result = result.filter((p) => p.price < 100);
        break;
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
  }, [searchQuery, products, sortBy, priceFilter]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  return (
    <div className="relative min-h-screen noise-bg">
      <ParticleCanvas />
      <div className="relative z-10 pt-14">
        <Navbar
          categories={[]}
          activeCategory={categoryName}
          onCategorySelect={() => {}}
          productCounts={{}}
        />

        <section className="relative py-20">
          <div className="container mx-auto px-4">
            {/* Header */}
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    {categoryLabel}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filteredProducts.length} منتج
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
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
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`rounded-xl border-border/20 hover:border-primary/30 shrink-0 ${showFilters ? 'bg-primary/20 border-primary/40' : ''}`}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Filters bar */}
              {showFilters && (
                <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-sm">
                  {/* Sort */}
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                      <ArrowUpDown className="h-3 w-3" />
                      الترتيب
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                        <button
                          key={key}
                          onClick={() => { setSortBy(key); setVisibleCount(ITEMS_PER_PAGE); }}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                            sortBy === key
                              ? "bg-primary/30 text-white border border-primary/60 shadow-[0_0_10px_-2px_hsl(199,89%,48%,0.4)]"
                              : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10"
                          }`}
                        >
                          {SORT_LABELS[key]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price filter */}
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3 w-3" />
                      السعر
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(PRICE_LABELS) as PriceFilter[]).map((key) => (
                        <button
                          key={key}
                          onClick={() => { setPriceFilter(key); setVisibleCount(ITEMS_PER_PAGE); }}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                            priceFilter === key
                              ? "bg-primary/30 text-white border border-primary/60 shadow-[0_0_10px_-2px_hsl(199,89%,48%,0.4)]"
                              : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10"
                          }`}
                        >
                          {PRICE_LABELS[key]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
