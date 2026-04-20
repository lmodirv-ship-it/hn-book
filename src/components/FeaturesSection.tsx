import { motion } from "framer-motion";
import { Download, RefreshCw, Shield, DollarSign } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const chipColors = ["icon-chip-blue", "icon-chip-gold", "icon-chip-cyan", "icon-chip-green"];

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
              className="group relative glass-future glass-future-hover holo-sheen p-7"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <span className={`icon-chip ${chipColors[i]}`}>
                <feature.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-sm font-bold text-foreground">{t(feature.titleKey)}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground/80">
                {t(feature.descKey)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
