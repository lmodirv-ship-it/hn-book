import { useState, useEffect, useCallback } from "react";
import ParticleCanvas from "@/components/ParticleCanvas";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import Footer from "@/components/Footer";
import type { Product } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, ChevronLeft, ChevronRight, Filter, ArrowUpDown } from "lucide-react";
import { bookService, categoryService } from "@/services";
import type { Category } from "@/services/categoryService";

const LANGUAGES = [
  { value: "all", label: "كل اللغات" },
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
] as const;

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "الأحدث" },
  { value: "created_at:asc", label: "الأقدم" },
  { value: "price:asc", label: "السعر: الأقل" },
  { value: "price:desc", label: "السعر: الأعلى" },
  { value: "page_count:desc", label: "الصفحات: الأكثر" },
  { value: "page_count:asc", label: "الصفحات: الأقل" },
] as const;

const PAGE_SIZE = 50;

const mapBook = (b: any): Product => ({
  id: b.id,
  name: b.name,
  description: b.description,
  shortDescription: b.shortDescription ?? "",
  price: b.price,
  originalPrice: b.originalPrice,
  category: b.category,
  image: b.image,
  features: b.features,
  badge: b.badge,
  isFlashDeal: b.isFlashDeal,
  dealEndsIn: b.dealEndsIn,
  referenceCode: b.referenceCode,
  pdfUrl: b.pdfUrl,
  slug: b.slug,
  pageCount: b.pageCount,
});

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

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

const BooksPage = () => {
  useEffect(() => {
    document.title = "كتب | HN-Book";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = "أفضل منصة لقراءة وشراء الكتب بجميع اللغات";
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageTransitioning, setPageTransitioning] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortValue, setSortValue] = useState("created_at:desc");
  const [dbCategories, setDbCategories] = useState<Category[]>([]);

  useEffect(() => {
    categoryService.getAll().then((result) => {
      if (result.data) setDbCategories(result.data);
    });
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchPage = useCallback(async (page: number, search: string) => {
    if (!hasLoadedOnce) setLoading(true);
    setError(null);
    setPageTransitioning(true);

    const [sortBy, sortOrder] = sortValue.split(":") as [any, any];
    const offset = (page - 1) * PAGE_SIZE;
    const filter = {
      limit: PAGE_SIZE,
      offset,
      sortBy,
      sortOrder,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(selectedLanguage !== "all" ? { language: selectedLanguage } : {}),
      ...(selectedCategory !== "all" ? { category: selectedCategory } : {}),
    };

    try {
      const [booksResult, countResult] = await Promise.all([
        bookService.getAll(filter),
        bookService.getCount(filter),
      ]);

      if (booksResult.error) throw new Error(booksResult.error);

      setProducts((booksResult.data ?? []).map(mapBook));
      setTotalCount(countResult.data ?? 0);
    } catch (err) {
      console.error("[BooksPage] fetch error", err);
      setProducts([]);
      setError("تعذر تحميل الكتب حالياً. حاول مرة أخرى.");
    } finally {
      setLoading(false);
      setPageTransitioning(false);
      setHasLoadedOnce(true);
    }
  }, [hasLoadedOnce, selectedLanguage, selectedCategory, sortValue]);

  useEffect(() => {
    void fetchPage(currentPage, searchDebounced);
  }, [currentPage, searchDebounced, fetchPage]);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div className="relative min-h-screen noise-bg" dir="rtl">
      <ParticleCanvas />
      <div className="relative z-10 pt-14">
        <Navbar categories={[]} activeCategory="" onCategorySelect={() => {}} productCounts={{}} />

        <section className="relative py-8 sm:py-12">
          <div className="container mx-auto px-4">
            {/* header */}
            <div className="space-y-4 mb-8">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                  <Input
                    placeholder="ابحث عن كتاب..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-xl bg-card/30 border-border/20 focus:border-primary/30 transition-colors"
                  />
                </div>

                <Select value={selectedLanguage} onValueChange={(v) => { setSelectedLanguage(v); setSelectedCategory("all"); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px] rounded-xl bg-card/30 border-border/20">
                    <Filter className="h-3.5 w-3.5 ml-2 text-muted-foreground/50" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[160px] rounded-xl bg-card/30 border-border/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل التصنيفات</SelectItem>
                    {dbCategories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortValue} onValueChange={(v) => { setSortValue(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[160px] rounded-xl bg-card/30 border-border/20">
                    <ArrowUpDown className="h-3.5 w-3.5 ml-2 text-muted-foreground/50" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{totalCount.toLocaleString()} كتاب</span>
                <span>•</span>
                <span>صفحة {currentPage} من {totalPages}</span>
              </div>
            </div>

            {/* content */}
            {loading && products.length === 0 ? (
              <div className="grid gap-0 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 bg-black/90 rounded-2xl p-2 border border-white/5 shadow-[inset_0_0_30px_-10px_rgba(0,0,0,0.8)]">
                {Array.from({ length: 12 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="mt-20 text-center space-y-4">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground">{error}</p>
                <Button variant="outline" onClick={() => void fetchPage(currentPage, searchDebounced)}>
                  إعادة المحاولة
                </Button>
              </div>
            ) : products.length === 0 ? (
              <div className="mt-20 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد كتب مطابقة</p>
              </div>
            ) : (
              <>
                <div className={`relative grid gap-0 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 bg-black/90 rounded-2xl p-2 border border-white/5 shadow-[inset_0_0_30px_-10px_rgba(0,0,0,0.8)] transition-opacity duration-300 ${pageTransitioning ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                  {products.map((product, i) => (
                    <ProductCard key={product.id} product={product} index={i} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-1 flex-wrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    {pageNumbers.map((p, idx) =>
                      p === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground/50 text-sm select-none">…</span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === currentPage ? "default" : "ghost"}
                          size="sm"
                          onClick={() => goToPage(p)}
                          className={`h-9 w-9 rounded-lg text-sm font-semibold ${
                            p === currentPage
                              ? "bg-primary text-primary-foreground shadow-[0_0_15px_-3px_hsl(var(--primary)/0.5)]"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {p}
                        </Button>
                      )
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
                    >
                      <ChevronLeft className="h-4 w-4" />
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
