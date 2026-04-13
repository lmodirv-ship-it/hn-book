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
import { Zap, Search, ChevronDown, Package } from "lucide-react";

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

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  };

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  return (
    <div className="relative min-h-screen">
      <ParticleCanvas />

      <div className="relative z-10">
        <Navbar />
        <HeroSection />

        {/* Products Section */}
        <section id="products" className="relative py-24">
          <div className="container mx-auto px-4">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <motion.div
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary"
                animate={{
                  boxShadow: [
                    "0 0 15px rgba(139,92,246,0)",
                    "0 0 15px rgba(139,92,246,0.2)",
                    "0 0 15px rgba(139,92,246,0)",
                  ],
                }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                <Zap className="h-4 w-4" /> {products.length.toLocaleString()}+ Products
              </motion.div>
              <h2 className="text-4xl font-black md:text-5xl">
                Our Digital{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Products
                </span>
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Premium bundles with full resale rights — buy once, sell forever
              </p>
            </motion.div>

            {/* Search */}
            <div className="mx-auto mt-8 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(ITEMS_PER_PAGE);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category filters */}
            <motion.div
              className="mt-6 flex flex-wrap justify-center gap-2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Badge
                  variant={activeCategory === "All" ? "default" : "secondary"}
                  className="cursor-pointer px-4 py-1.5 text-xs font-medium transition-all"
                  onClick={() => handleCategoryChange("All")}
                >
                  All ({products.length})
                </Badge>
              </motion.div>
              {categories.map((cat) => {
                const count = products.filter((p) => p.category === cat).length;
                return (
                  <motion.div key={cat} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Badge
                      variant={activeCategory === cat ? "default" : "secondary"}
                      className="cursor-pointer px-4 py-1.5 text-xs font-medium transition-all"
                      onClick={() => handleCategoryChange(cat)}
                    >
                      {cat} ({count})
                    </Badge>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Results count */}
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              Showing {visibleProducts.length} of {filteredProducts.length.toLocaleString()} products
            </div>

            {/* Product grid */}
            <div className="mt-8 grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {visibleProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i % ITEMS_PER_PAGE} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <motion.div
                className="mt-12 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleLoadMore}
                  className="gap-2 px-8"
                >
                  <ChevronDown className="h-4 w-4" />
                  Load More ({(filteredProducts.length - visibleCount).toLocaleString()} remaining)
                </Button>
              </motion.div>
            )}

            {filteredProducts.length === 0 && (
              <div className="mt-16 text-center">
                <p className="text-lg text-muted-foreground">No products found. Try a different search.</p>
              </div>
            )}
          </div>
        </section>

        <div id="features">
          <FeaturesSection />
        </div>

        {/* CTA Section */}
        <section className="relative py-24">
          <div className="container mx-auto px-4">
            <motion.div
              className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border bg-card p-12 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, type: "spring" }}
              viewport={{ once: true }}
            >
              <div className="absolute -inset-0.5 -z-10 rounded-3xl bg-gradient-to-r from-primary via-accent to-primary opacity-30 blur-sm" />
              <motion.div
                className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 4 }}
              />
              <motion.div
                className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-accent/10 blur-3xl"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ repeat: Infinity, duration: 5 }}
              />

              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent"
              >
                <Zap className="h-8 w-8 text-primary-foreground" />
              </motion.div>

              <h2 className="text-3xl font-black md:text-4xl">
                Get{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Everything
                </span>
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                All {products.length.toLocaleString()}+ products in one massive bundle. Full PLR/MRR resale rights included.
              </p>

              <motion.div
                className="mt-8 flex items-baseline justify-center gap-3"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.3 }}
                viewport={{ once: true }}
              >
                <span className="text-5xl font-black text-primary md:text-6xl">$149</span>
                <span className="text-xl text-muted-foreground line-through">$4,990</span>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Badge variant="destructive" className="text-sm font-bold">
                    Save 97%
                  </Badge>
                </motion.div>
              </motion.div>

              <motion.a
                href="#products"
                className="mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-10 text-lg font-bold text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:shadow-2xl hover:shadow-primary/40"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Zap className="h-5 w-5" />
                Get All Products Now
              </motion.a>

              <p className="mt-4 text-sm text-muted-foreground">
                Instant access • Full PLR/MRR rights • 30-day guarantee
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
