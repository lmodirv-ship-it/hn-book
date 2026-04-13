import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { useRef } from "react";

const HeroSection = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  const stats = [
    { value: "100M+", label: "Digital Products" },
    { value: "8", label: "Product Bundles" },
    { value: "PLR/MRR", label: "Full Rights" },
    { value: "24/7", label: "Instant Access" },
  ];

  return (
    <section ref={ref} className="relative min-h-[90vh] overflow-hidden flex items-center">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[100px]"
          animate={{
            x: [0, 60, 0],
            y: [0, 40, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-accent/20 blur-[100px]"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive/10 blur-[80px]"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <motion.div style={{ y, opacity, scale }} className="container mx-auto px-4 text-center relative z-10">
        {/* Floating badge */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          <motion.div
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-5 py-2 text-sm font-medium text-primary backdrop-blur-sm"
            animate={{ boxShadow: ["0 0 20px rgba(139,92,246,0)", "0 0 20px rgba(139,92,246,0.3)", "0 0 20px rgba(139,92,246,0)"] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            <Sparkles className="h-4 w-4" />
            100M+ Digital Products with Resale Rights
            <Star className="h-4 w-4 fill-current" />
          </motion.div>
        </motion.div>

        {/* Main heading with stagger */}
        <div className="overflow-hidden">
          <motion.h1
            className="mx-auto max-w-4xl text-5xl font-black tracking-tight md:text-7xl lg:text-8xl"
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, type: "spring", stiffness: 50 }}
          >
            <span className="block">Your digital empire</span>
            <motion.span
              className="block bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent"
              animate={{ backgroundPosition: ["0% center", "200% center"] }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            >
              starts here
            </motion.span>
          </motion.h1>
        </div>

        <motion.p
          className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground md:text-xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          eBooks, courses, templates, AI prompts & design assets — all with full resale rights.{" "}
          <span className="font-semibold text-foreground">Buy once, sell forever.</span>
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button size="lg" className="relative gap-2 px-10 py-6 text-lg font-bold shadow-xl shadow-primary/25" asChild>
              <a href="#products">
                <motion.span
                  className="absolute inset-0 rounded-md bg-gradient-to-r from-primary to-accent opacity-0"
                  whileHover={{ opacity: 0.15 }}
                />
                Browse Products <ArrowRight className="h-5 w-5" />
              </a>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="outline" size="lg" className="px-10 py-6 text-lg backdrop-blur-sm" asChild>
              <a href="#features">Why Choose Us</a>
            </Button>
          </motion.div>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm"
              whileHover={{ scale: 1.05, borderColor: "hsl(var(--primary))" }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + i * 0.1 }}
            >
              <div className="text-2xl font-black text-primary md:text-3xl">{stat.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust badges */}
        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
        >
          {["✓ Instant Download", "✓ Full Resale Rights", "✓ Money-Back Guarantee"].map((text) => (
            <motion.span
              key={text}
              whileHover={{ color: "hsl(var(--primary))", scale: 1.05 }}
              className="cursor-default"
            >
              {text}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground">Scroll</span>
          <div className="h-8 w-5 rounded-full border-2 border-muted-foreground/30 p-1">
            <motion.div
              className="h-2 w-full rounded-full bg-primary"
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
