import ParticleCanvas from "@/components/ParticleCanvas";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProductCard from "@/components/ProductCard";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";
import { products } from "@/lib/products";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

const categories = [...new Set(products.map((p) => p.category))];

const Index = () => {
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
                animate={{ boxShadow: ["0 0 15px rgba(139,92,246,0)", "0 0 15px rgba(139,92,246,0.2)", "0 0 15px rgba(139,92,246,0)"] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                <Zap className="h-4 w-4" /> Premium Collection
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

            {/* Category badges with animation */}
            <motion.div
              className="mt-8 flex flex-wrap justify-center gap-2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {categories.map((cat, i) => (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.1 }}
                >
                  <Badge variant="secondary" className="cursor-default px-4 py-1.5 text-xs font-medium backdrop-blur-sm">
                    {cat}
                  </Badge>
                </motion.div>
              ))}
            </motion.div>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
        <section className="relative py-24">
          <div className="container mx-auto px-4">
            <motion.div
              className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border bg-card p-12 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, type: "spring" }}
              viewport={{ once: true }}
            >
              {/* Animated border glow */}
              <div className="absolute -inset-0.5 -z-10 rounded-3xl bg-gradient-to-r from-primary via-accent to-primary opacity-30 blur-sm" />

              {/* Background orbs */}
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
                Get the{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Complete Bundle
                </span>
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                All 8 product packs at a massive discount. 100M+ digital products with full resale rights.
              </p>

              <motion.div
                className="mt-8 flex items-baseline justify-center gap-3"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.3 }}
                viewport={{ once: true }}
              >
                <span className="text-5xl font-black text-primary md:text-6xl">$99</span>
                <span className="text-xl text-muted-foreground line-through">$690</span>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Badge variant="destructive" className="text-sm font-bold">Save 85%</Badge>
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
