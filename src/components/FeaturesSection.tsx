import { motion } from "framer-motion";
import { Download, RefreshCw, Shield, DollarSign } from "lucide-react";

const features = [
  {
    icon: Download,
    title: "Instant Download",
    description: "Get all your files immediately after purchase. No waiting, no shipping.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: DollarSign,
    title: "Full Resale Rights",
    description: "PLR & MRR included. Resell products as your own and keep 100% of profits.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Shield,
    title: "Money-Back Guarantee",
    description: "Not happy? Get a full refund within 30 days, no questions asked.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: RefreshCw,
    title: "Free Lifetime Updates",
    description: "New products added regularly. Buy once, get updates forever.",
    color: "from-purple-500 to-pink-500",
  },
];

const FeaturesSection = () => {
  return (
    <section className="relative overflow-hidden border-t bg-secondary/30 py-24">
      {/* Background decoration */}
      <motion.div
        className="absolute right-0 top-0 h-96 w-96 rounded-full bg-primary/5 blur-[100px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ repeat: Infinity, duration: 8 }}
      />

      <div className="container mx-auto px-4">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-black md:text-5xl">
            Why choose{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              us?
            </span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            100M+ products, full rights, instant access
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="group relative"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              viewport={{ once: true }}
            >
              <motion.div
                className="relative overflow-hidden rounded-2xl border bg-card p-8 transition-all duration-500 hover:shadow-2xl"
                whileHover={{ y: -8, scale: 1.02 }}
              >
                {/* Gradient top border */}
                <div className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${feature.color} opacity-0 transition-opacity group-hover:opacity-100`} />

                <motion.div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg`}
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <feature.icon className="h-7 w-7 text-primary-foreground" />
                </motion.div>

                <h3 className="mt-6 text-xl font-bold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
