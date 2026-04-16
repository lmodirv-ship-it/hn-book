import { useState, useEffect, useCallback } from "react";
import ParticleCanvas from "@/components/ParticleCanvas";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import Footer from "@/components/Footer";
import type { Product } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { bookService } from "@/services";

const PAGE_SIZE = 50;

// ─── helpers ─────────────────────────────────────────────────

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

/** Build visible page numbers: show max 7 with ellipsis */
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

// ─── component ───────────────────────────────────────────────

const BooksPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // debounce search 400ms
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // fetch page data
  const fetchPage = useCallback(async (page: number, search: string) => {
    // Only show full skeleton on first load (no existing data)
    if (products.length === 0) setLoading(true);
    setError(null);
    setPageTransitioning(true);

    const offset = (page - 1) * PAGE_SIZE;
    const filter = {
      limit: PAGE_SIZE,
      offset,
      ...(search.trim() ? { search: search.trim() } : {}),
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
    }
  }, []);

  useEffect(() => {
    void fetchPage(currentPage, searchDebounced);
  }, [currentPage, searchDebounced, fetchPage]);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  // ─── render ──────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen noise-bg" dir="rtl">
      <ParticleCanvas />
      <div className="relative z-10 pt-14">
        <Navbar categories={[]} activeCategory="" onCategorySelect={() => {}} productCounts={{}} />

        <section className="relative py-8 sm:py-12">
          <div className="container mx-auto px-4">
            {/* header */}
            <div className="space-y-3 mb-8">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  placeholder="ابحث عن كتاب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl bg-card/30 border-border/20 focus:border-primary/30 transition-colors"
                />
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{totalCount.toLocaleString()} كتاب</span>
                <span>•</span>
                <span>صفحة {currentPage} من {totalPages}</span>
              </div>
            </div>

            {/* content */}
            {loading ? (
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
                <div className="grid gap-0 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 bg-black/90 rounded-2xl p-2 border border-white/5 shadow-[inset_0_0_30px_-10px_rgba(0,0,0,0.8)]">
                  {products.map((product, i) => (
                    <ProductCard key={product.id} product={product} index={i} />
                  ))}
                </div>

                {/* pagination */}
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
