import { motion } from "framer-motion";
import { Download, RefreshCw, Shield, DollarSign } from "lucide-react";

const features = [
  {
    icon: Download,
    title: "Instant Download",
    description: "Get all your files immediately after purchase. No waiting.",
  },
  {
    icon: DollarSign,
    title: "Full Resale Rights",
    description: "PLR & MRR included. Resell as your own, keep 100% profits.",
  },
  {
    icon: Shield,
    title: "30-Day Guarantee",
    description: "Not happy? Full refund within 30 days, no questions asked.",
  },
  {
    icon: RefreshCw,
    title: "Lifetime Updates",
    description: "New products added regularly. Buy once, get updates forever.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="relative py-24">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <span className="text-xs font-medium uppercase tracking-widest text-primary">
            Why Choose Us
          </span>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            Everything you need to{" "}
            <span className="text-gradient-static">succeed</span>
          </h2>
        </motion.div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="group rounded-xl border border-border/30 bg-card/40 p-6 transition-all duration-300 hover:border-primary/15 hover:bg-card/70"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              viewport={{ once: true }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
