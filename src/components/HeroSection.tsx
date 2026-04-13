import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Star, Play } from "lucide-react";
import { products } from "@/lib/products";
import { useRef } from "react";

const HeroSection = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.97]);

  const stats = [
    { value: "100M+", label: "Digital Products", icon: "📦" },
    { value: `${products.length.toLocaleString()}+`, label: "Product Bundles", icon: "🎁" },
    { value: "PLR/MRR", label: "Full Rights", icon: "🔑" },
    { value: "24/7", label: "Instant Access", icon: "⚡" },
  ];

  return (
    <section ref={ref} className="relative min-h-[92vh] overflow-hidden flex items-center">
      {/* Ambient glow orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-primary/15 blur-[120px]"
          animate={{ x: [0, 80, 0], y: [0, 50, 0], scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 -right-32 h-[700px] w-[700px] rounded-full bg-accent/12 blur-[140px]"
          animate={{ x: [0, -60, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-primary/8 blur-[100px]"
          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
        />

        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <motion.div style={{ y, opacity, scale }} className="container mx-auto px-4 text-center relative z-10">
        {/* Floating badge */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          <motion.div
            className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-primary/20 glass-subtle px-5 py-2.5 text-sm font-medium text-primary"
            animate={{ boxShadow: ["0 0 30px hsl(260 80% 65% / 0)", "0 0 30px hsl(260 80% 65% / 0.15)", "0 0 30px hsl(260 80% 65% / 0)"] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            <Sparkles className="h-4 w-4" />
            100M+ Digital Products with Resale Rights
            <Star className="h-4 w-4 fill-current" />
          </motion.div>
        </motion.div>

        {/* Main heading */}
        <div className="overflow-hidden">
          <motion.h1
            className="mx-auto max-w-5xl text-5xl font-extrabold tracking-tight md:text-7xl lg:text-[5.5rem] leading-[1.05]"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 60 }}
          >
            <span className="block text-foreground">Your digital empire</span>
            <motion.span
              className="block text-gradient bg-[length:200%_auto] mt-1"
              animate={{ backgroundPosition: ["0% center", "200% center"] }}
              transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
            >
              starts here
            </motion.span>
          </motion.h1>
        </div>

        <motion.p
          className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground/80 md:text-xl leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          eBooks, courses, templates, AI prompts & design assets — all with full resale rights.{" "}
          <span className="font-semibold text-foreground">Buy once, sell forever.</span>
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              className="relative gap-2.5 rounded-2xl px-10 py-7 text-lg font-bold shadow-glow-lg bg-gradient-to-r from-primary to-accent border-0 hover:shadow-glow-lg transition-all duration-300"
              asChild
            >
              <a href="#products">
                Browse Products <ArrowRight className="h-5 w-5" />
              </a>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="outline"
              size="lg"
              className="gap-2.5 rounded-2xl px-10 py-7 text-lg glass-subtle border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300"
              asChild
            >
              <a href="#features">
                <Play className="h-4 w-4" />
                Why Choose Us
              </a>
            </Button>
          </motion.div>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="mx-auto mt-20 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="group rounded-2xl glass-subtle p-5 transition-all duration-500 hover:border-primary/30 hover:shadow-glow"
              whileHover={{ y: -4 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.08 }}
            >
              <div className="text-lg mb-1">{stat.icon}</div>
              <div className="text-2xl font-extrabold text-gradient-static md:text-3xl">{stat.value}</div>
              <div className="mt-1 text-xs text-muted-foreground font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust badges */}
        <motion.div
          className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          {[
            { icon: "✓", text: "Instant Download" },
            { icon: "✓", text: "Full Resale Rights" },
            { icon: "✓", text: "Money-Back Guarantee" },
          ].map((item) => (
            <motion.span
              key={item.text}
              className="flex items-center gap-1.5 cursor-default"
              whileHover={{ color: "hsl(var(--primary))", x: 2 }}
            >
              <span className="text-accent font-bold">{item.icon}</span>
              {item.text}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2.5 }}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium">Scroll</span>
          <div className="h-8 w-[18px] rounded-full border border-muted-foreground/20 p-1">
            <motion.div
              className="h-2 w-full rounded-full bg-gradient-to-b from-primary to-accent"
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
