import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, CheckCircle2 } from "lucide-react";
import { products } from "@/lib/products";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background mesh gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/8 blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-accent/6 blur-[130px]" />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {products.length.toLocaleString()}+ Digital Products Available
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            className="text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl leading-[0.95]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span className="text-foreground">Build your</span>
            <br />
            <span className="text-gradient-static">digital empire</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed md:text-xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Premium eBooks, courses, templates & AI tools — all with full resale rights.
            Buy once, sell forever.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button
              size="lg"
              className="gap-2 rounded-xl px-8 py-6 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow border-0"
              asChild
            >
              <a href="#products">
                Browse Products <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="gap-2 rounded-xl px-8 py-6 text-base text-muted-foreground hover:text-foreground"
              asChild
            >
              <a href="#features">
                <Play className="h-4 w-4" />
                Learn More
              </a>
            </Button>
          </motion.div>

          {/* Trust */}
          <motion.div
            className="mt-14 flex flex-wrap gap-6 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {["Instant Download", "Full PLR/MRR Rights", "30-Day Guarantee"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                {t}
              </span>
            ))}
          </motion.div>

          {/* Stats row */}
          <motion.div
            className="mt-16 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/50 bg-border/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {[
              { value: `${products.length.toLocaleString()}+`, label: "Products" },
              { value: "PLR/MRR", label: "Full Rights" },
              { value: "24/7", label: "Instant Access" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card/80 px-6 py-5 text-center">
                <div className="text-2xl font-bold text-foreground md:text-3xl">{stat.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
