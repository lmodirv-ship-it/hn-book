import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { tablouService, TABLOU_CATEGORIES, type Tablou } from "@/services/tablouService";
import { Frame, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;

const TablouPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Tablou[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    setLoading(true);
    tablouService
      .getAll({ category: category === "all" ? undefined : category, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      .then(({ data, count }) => { setItems(data); setTotal(count); setLoading(false); });
  }, [category, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />

      {/* Hero */}
      <section className="relative py-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">معرض الفن</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
            تابلوهات <span className="text-primary">فنية</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            اكتشف مجموعة متنوعة من اللوحات الفنية بأحجام مختلفة
          </p>
        </div>
      </section>

      {/* Filters */}
      <div className="container mx-auto px-4 mb-8">
        <div className="flex flex-wrap gap-2 justify-center">
          <button onClick={() => { setCategory("all"); setPage(0); }} className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${category === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40"}`}>
            الكل
          </button>
          {TABLOU_CATEGORIES.map(c => (
            <button key={c.value} onClick={() => { setCategory(c.value); setPage(0); }} className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${category === c.value ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40"}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery */}
      <div className="container mx-auto px-4 pb-16">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Frame className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold">لا توجد لوحات</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="group cursor-pointer rounded-xl overflow-hidden border border-border bg-card hover:border-primary/40 transition-all hover:shadow-lg"
                onClick={() => navigate(`/tablou/${t.id}`)}
              >
                <div className="aspect-square overflow-hidden bg-muted/10">
                  <img
                    src={t.image_url}
                    alt={t.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm text-foreground truncate">{t.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-muted-foreground">
                      {TABLOU_CATEGORIES.find(c => c.value === t.category)?.label}
                    </span>
                    <span className="font-bold text-primary text-sm">
                      {t.base_price} <span className="text-[10px]">د.م</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default TablouPage;
