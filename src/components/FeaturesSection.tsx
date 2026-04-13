import { motion } from "framer-motion";
import { Download, RefreshCw, Shield, DollarSign } from "lucide-react";

const features = [
  {
    icon: Download,
    title: "Instant Download",
    description: "Get all your files immediately after purchase. No waiting, no shipping.",
  },
  {
    icon: DollarSign,
    title: "Full Resale Rights",
    description: "PLR & MRR included. Resell products as your own and keep 100% of profits.",
  },
  {
    icon: Shield,
    title: "Money-Back Guarantee",
    description: "Not happy? Get a full refund within 30 days, no questions asked.",
  },
  {
    icon: RefreshCw,
    title: "Free Lifetime Updates",
    description: "New products added regularly. Buy once, get updates forever.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="border-t bg-secondary/30 py-20">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold md:text-4xl">Why choose us?</h2>
          <p className="mt-3 text-muted-foreground">
            100M+ products, full rights, instant access
          </p>
        </motion.div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
