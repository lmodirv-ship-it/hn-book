import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, CheckCircle2, Zap, Package, Crown, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import FuturisticBackground from "@/components/FuturisticBackground";

const HeroSection = () => {
  const { t } = useI18n();
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      setProductCount(count || 0);
    };
    fetchCount();
  }, []);

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden">
      <FuturisticBackground particles={32} />
      {/* Soft orbs over the futuristic backdrop */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="orb orb-1 absolute top-[10%] left-[15%] h-[400px] w-[400px] bg-primary/15" />
        <div className="orb orb-2 absolute top-[50%] right-[10%] h-[350px] w-[350px] bg-accent/12" />
        <div className="orb orb-3 absolute bottom-[5%] left-[40%] h-[300px] w-[300px] bg-[hsl(170,80%,55%)]/10" />
      </div>

      <div className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl">
          {/* Badge */}
          <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
          >
            <span className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-xs font-medium bg-primary/5 border border-primary/15 text-primary/90">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              {productCount.toLocaleString()}+ {t("hero.badge")}
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-5xl font-bold tracking-tighter md:text-7xl lg:text-[5.5rem] leading-[0.9]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <span className="text-foreground">{t("hero.title1")}</span>
            <br />
            <span className="text-holo">{t("hero.title2")}</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            className="mt-7 max-w-lg text-base text-muted-foreground leading-relaxed md:text-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {t("hero.desc")}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Button
              size="lg"
              className="group gap-2 rounded-full px-8 py-6 text-base font-bold bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:from-accent/90 hover:to-accent/70 shadow-glow-accent border-0 transition-all duration-300 hover:shadow-[0_8px_30px_-4px_hsl(25,95%,53%,0.5)]"
              asChild
            >
              <a href="#products">
                <Zap className="h-4 w-4" />
                {t("hero.browse")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="gap-2 rounded-full px-8 py-6 text-base text-muted-foreground hover:text-foreground hover:bg-muted/30"
              asChild
            >
              <a href="#features">
                <Play className="h-4 w-4" />
                {t("hero.learn")}
              </a>
            </Button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            className="mt-14 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {[t("hero.trust1"), t("hero.trust2"), t("hero.trust3")].map((txt) => (
              <span key={txt} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary/70" />
                <span className="text-muted-foreground/80">{txt}</span>
              </span>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div
            className="mt-16 grid grid-cols-3 gap-px overflow-hidden rounded-2xl glass-future holo-sheen"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            {[
              { value: `${productCount.toLocaleString()}+`, label: t("hero.statProducts"), icon: Package, color: "blue" },
              { value: "PLR/MRR", label: t("hero.statRights"), icon: Crown, color: "gold" },
              { value: "24/7", label: t("hero.statAccess"), icon: Clock, color: "cyan" },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`relative px-6 py-7 text-center ${i < 2 ? 'border-r border-primary/15' : ''}`}>
                  <div className="flex justify-center mb-3">
                    <span className={`icon-chip icon-chip-${stat.color}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-holo md:text-3xl">{stat.value}</div>
                  <div className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">{stat.label}</div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
