import { motion } from "framer-motion";
import { Download, RefreshCw, Shield, DollarSign } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const iconColors = [
  "from-primary/20 to-primary/5 text-primary",
  "from-accent/20 to-accent/5 text-accent",
  "from-emerald-500/20 to-emerald-500/5 text-emerald-400",
  "from-violet-500/20 to-violet-500/5 text-violet-400",
];

const FeaturesSection = () => {
  const { t } = useI18n();

  const features = [
    { icon: Download, titleKey: "features.instantDownload", descKey: "features.instantDownloadDesc" },
    { icon: DollarSign, titleKey: "features.resaleRights", descKey: "features.resaleRightsDesc" },
    { icon: Shield, titleKey: "features.guarantee", descKey: "features.guaranteeDesc" },
    { icon: RefreshCw, titleKey: "features.updates", descKey: "features.updatesDesc" },
  ];

  return (
    <section className="relative py-28">
      {/* Background accent */}
      <div className="absolute inset-0 gradient-mesh" />
      
      <div className="container mx-auto px-4 relative">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium bg-primary/5 border border-primary/10 text-primary/80">
            {t("features.tag")}
          </span>
          <h2 className="mt-5 text-3xl font-bold md:text-5xl tracking-tight">
            {t("features.title")}{" "}
            <span className="text-gradient-static">{t("features.titleHighlight")}</span>
          </h2>
        </motion.div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.titleKey}
              className="group relative rounded-2xl p-3 bg-black/95 border border-black/80 shadow-[0_4px_30px_-5px_rgba(0,0,0,0.9),inset_0_0_25px_-3px_hsl(199,89%,68%,0.25),inset_0_0_50px_-8px_hsl(199,89%,68%,0.1)]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="relative rounded-xl p-7 bg-black/90 border border-[hsl(199,89%,68%,0.35)] shadow-[0_0_25px_-2px_hsl(199,89%,68%,0.4),inset_0_0_20px_-3px_hsl(199,89%,68%,0.25)]">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b ${iconColors[i]} transition-transform duration-300 group-hover:scale-110`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-sm font-bold text-foreground">{t(feature.titleKey)}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground/80">
                  {t(feature.descKey)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
