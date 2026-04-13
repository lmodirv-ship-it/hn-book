import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProductCard from "@/components/ProductCard";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";
import { products } from "@/lib/products";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const categories = [...new Set(products.map((p) => p.category))];

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />

      <HeroSection />

      {/* Products Section */}
      <section id="products" className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold md:text-4xl">Our Digital Products</h2>
            <p className="mt-3 text-muted-foreground">
              Premium bundles with full resale rights — buy once, sell forever
            </p>
          </motion.div>

          {/* Category badges */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <Badge key={cat} variant="secondary" className="cursor-default px-3 py-1 text-xs">
                {cat}
              </Badge>
            ))}
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </div>
      </section>

      <div id="features">
        <FeaturesSection />
      </div>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="mx-auto max-w-2xl rounded-2xl border bg-card p-10 text-center shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold md:text-3xl">
              Get the{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Complete Bundle
              </span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              All 8 product packs at a massive discount. 100M+ digital products with full resale rights.
            </p>
            <div className="mt-6 flex items-baseline justify-center gap-3">
              <span className="text-4xl font-bold">$99</span>
              <span className="text-lg text-muted-foreground line-through">$690</span>
              <Badge variant="destructive">Save 85%</Badge>
            </div>
            <a href="#products">
              <motion.button
                className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Get All Products Now
              </motion.button>
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
