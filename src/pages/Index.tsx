import { useState, useMemo, useEffect } from "react";
import ParticleCanvas from "@/components/ParticleCanvas";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProductCard from "@/components/ProductCard";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";
import type { Product } from "@/lib/products";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ArrowRight, Loader2, Sparkles, BookOpen } from "lucide-react";
import CategoryBar from "@/components/CategoryBar";
import { useI18n } from "@/lib/i18n";
import { bookService } from "@/services";

const ITEMS_PER_PAGE = 100;
const INITIAL_FETCH_LIMIT = 10;
const FETCH_TIMEOUT_MS = 8000;

const ALL_CATEGORIES = ["كتب", "بطاقات", "قوالب", "صور", "وثائق", "عروض", "أخرى"];

const HIDDEN_FROM_NAV = new Set([
  "التاريخ", "العلوم", "الطب", "الأدب العربي", "الدين الإسلامي",
  "تطوير الذات", "الفلسفة والفكر", "اللغة العربية", "الاقتصاد والمال",
  "التكنولوجيا", "Arabic literature", "Literature", "Philosophy",
  "Biography & Autobiography", "Photography", "مطبخ الدار",
]);

const timeoutPromise = () =>
  new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Products fetch timeout")), FETCH_TIMEOUT_MS);
  });

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("[Index] Fetching books...", { limit: INITIAL_FETCH_LIMIT });

        const result = await Promise.race([
          bookService.getAll({ limit: INITIAL_FETCH_LIMIT }),
          timeoutPromise(),
        ]);

        console.log("[Index] Books:", result);

        if (result.error) {
          throw new Error(result.error);
        }

        if (!cancelled) {
          setProducts(result.data ?? []);
        }
      } catch (error) {
        console.error("[Index] Error fetching books:", error);
        if (!cancelled) {
          setProducts([]);
          setError("فشل تحميل الكتب");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const dbCats = [...new Set(products.map((p) => p.category))];
    const merged = [...ALL_CATEGORIES];
    dbCats.forEach((c) => { if (!merged.includes(c)) merged.push(c); });
    return merged.filter((c) => products.some((p) => p.category === c) && !HIDDEN_FROM_NAV.has(c));
  }, [products]);

  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (activeCategory !== "All") {
      filtered = filtered.filter((p) => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [activeCategory, searchQuery, products]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  return (
    <div className="relative min-h-screen noise-bg">
      <ParticleCanvas />
      <div className="relative z-10 pt-14">
        <Navbar
          categories={categories}
          activeCategory={activeCategory}
          onCategorySelect={(cat) => { setActiveCategory(cat); setVisibleCount(ITEMS_PER_PAGE); }}
          productCounts={productCounts}
        />

        {/* Products Section */}
        <section id="products" className="relative py-20">
          <div className="container mx-auto px-4">
            {/* Search */}
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                placeholder={t("products.search")}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(ITEMS_PER_PAGE);
                }}
                className="pl-10 rounded-xl bg-card/30 border-border/20 focus:border-primary/30 transition-colors"
              />
            </div>

            {loading ? (
              <div className="mt-20 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                <span className="text-sm text-muted-foreground/50">جاري التحميل...</span>
              </div>
            ) : error ? (
              <div className="mt-20 flex flex-col items-center gap-3 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground/70">{error}</span>
              </div>
            ) : (
              <>
                <div className="mt-8 grid gap-0 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 bg-black/90 rounded-2xl p-2 border border-white/5 shadow-[inset_0_0_30px_-10px_rgba(0,0,0,0.8)]">
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
                      {t("products.loadMore")}
                    </Button>
                  </div>
                )}

                {filteredProducts.length === 0 && (
                  <div className="mt-20 text-center text-muted-foreground/50">
                    {t("products.empty")}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <div id="features">
          <FeaturesSection />
        </div>

        {/* CTA Section */}
        <section id="pricing" className="relative py-24">
          <div className="container mx-auto px-4">
            <motion.div
              className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl p-10 text-center md:p-16 glass-glow"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="absolute inset-0 gradient-mesh opacity-50 rounded-3xl" />
              
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium bg-accent/10 border border-accent/15 text-accent">
                  <Sparkles className="h-3 w-3" />
                  {t("cta.tag")}
                </span>
                <h2 className="mt-6 text-3xl font-bold md:text-5xl tracking-tight">
                  {t("cta.title")} <span className="text-gradient-static">{t("cta.titleHighlight")}</span>
                </h2>
                <p className="mt-4 text-muted-foreground/70 max-w-md mx-auto">
                  {t("cta.desc")}
                </p>

                <div className="mt-10 flex items-baseline justify-center gap-3">
                  <span className="text-5xl font-bold text-foreground md:text-7xl tracking-tight">$149</span>
                  <span className="text-lg text-muted-foreground/30 line-through">$4,990</span>
                  <Badge className="bg-primary/10 text-primary border-primary/15 text-xs font-bold">
                    {t("cta.save")}
                  </Badge>
                </div>

                <Button
                  size="lg"
                  className="mt-10 gap-2 rounded-full px-12 py-7 text-base font-bold bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:from-accent/90 hover:to-accent/70 shadow-glow-accent border-0 transition-all duration-300 hover:shadow-[0_8px_30px_-4px_hsl(25,95%,53%,0.5)]"
                  asChild
                >
                  <a href="#products">
                    {t("cta.button")} <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>

                <p className="mt-5 text-xs text-muted-foreground/30">
                  {t("cta.note")}
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default Index;
