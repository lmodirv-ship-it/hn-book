import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            100M+ Digital Products with Resale Rights
          </div>
        </motion.div>

        <motion.h1
          className="mx-auto max-w-4xl text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Your digital empire{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            starts here
          </span>
        </motion.h1>

        <motion.p
          className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          eBooks, courses, templates, AI prompts & design assets — all with full resale rights. Buy once, sell forever.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Button size="lg" className="gap-2 px-8 text-base" asChild>
            <a href="#products">
              Browse Products <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" size="lg" className="text-base" asChild>
            <a href="#features">Why Choose Us</a>
          </Button>
        </motion.div>

        <motion.div
          className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <span>✓ Instant Download</span>
          <span>✓ Full Resale Rights</span>
          <span>✓ 100M+ Products</span>
          <span>✓ Money-Back Guarantee</span>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
