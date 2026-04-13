import { useState, useMemo } from "react";
import ParticleCanvas from "@/components/ParticleCanvas";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProductCard from "@/components/ProductCard";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";
import { products, categories } from "@/lib/products";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ArrowRight } from "lucide-react";

const ITEMS_PER_PAGE = 24;

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

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
  }, [activeCategory, searchQuery]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  return (
    <div className="relative min-h-screen noise-bg">
      <ParticleCanvas />
      <div className="relative z-10">
        <Navbar />
        

        {/* Products Section */}
        <section id="products" className="relative py-20">
          <div className="container mx-auto px-4">
            {/* Section header */}
            <motion.div
              className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              viewport={{ once: true }}
            >
              <div>
                <span className="text-xs font-medium uppercase tracking-widest text-primary">
                  Catalog
                </span>
                <h2 className="mt-2 text-3xl font-bold md:text-4xl">
                  Browse Products
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {filteredProducts.length.toLocaleString()} products available
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(ITEMS_PER_PAGE);
                  }}
                  className="pl-10 rounded-lg bg-card/50 border-border/40"
                />
              </div>
            </motion.div>

            {/* Category filters */}
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge
                variant={activeCategory === "All" ? "default" : "secondary"}
                className="cursor-pointer px-3 py-1 text-xs transition-all hover:bg-primary/10"
                onClick={() => { setActiveCategory("All"); setVisibleCount(ITEMS_PER_PAGE); }}
              >
                All
              </Badge>
              {categories.map((cat) => (
                <Badge
                  key={cat}
                  variant={activeCategory === cat ? "default" : "secondary"}
                  className="cursor-pointer px-3 py-1 text-xs transition-all hover:bg-primary/10"
                  onClick={() => { setActiveCategory(cat); setVisibleCount(ITEMS_PER_PAGE); }}
                >
                  {cat}
                </Badge>
              ))}
            </div>

            {/* Product grid */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visibleProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i % ITEMS_PER_PAGE} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="mt-10 text-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((p) => p + ITEMS_PER_PAGE)}
                  className="gap-2 rounded-lg px-6"
                >
                  <ChevronDown className="h-4 w-4" />
                  Load More
                </Button>
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="mt-16 text-center text-muted-foreground">
                No products found.
              </div>
            )}
          </div>
        </section>

        <div id="features">
          <FeaturesSection />
        </div>

        {/* CTA Section */}
        <section id="pricing" className="relative py-20">
          <div className="container mx-auto px-4">
            <motion.div
              className="mx-auto max-w-2xl rounded-2xl border border-border/30 bg-card/50 p-10 text-center md:p-14"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <span className="text-xs font-medium uppercase tracking-widest text-primary">
                Bundle Deal
              </span>
              <h2 className="mt-4 text-3xl font-bold md:text-4xl">
                Get <span className="text-gradient-static">everything</span>
              </h2>
              <p className="mt-3 text-muted-foreground">
                All {products.length.toLocaleString()}+ products with full PLR/MRR resale rights.
              </p>

              <div className="mt-8 flex items-baseline justify-center gap-3">
                <span className="text-5xl font-bold text-foreground md:text-6xl">$149</span>
                <span className="text-lg text-muted-foreground/50 line-through">$4,990</span>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                  Save 97%
                </Badge>
              </div>

              <Button
                size="lg"
                className="mt-8 gap-2 rounded-xl px-10 py-6 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow border-0"
                asChild
              >
                <a href="#products">
                  Get All Products <ArrowRight className="h-4 w-4" />
                </a>
              </Button>

              <p className="mt-4 text-xs text-muted-foreground/50">
                Instant access • Full rights • 30-day guarantee
              </p>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default Index;
