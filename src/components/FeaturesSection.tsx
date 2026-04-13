import { motion } from "framer-motion";
import { Download, RefreshCw, Shield, DollarSign, Zap, Globe } from "lucide-react";

const features = [
  {
    icon: Download,
    title: "Instant Download",
    description: "Get all your files immediately after purchase. No waiting, no shipping delays.",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    icon: DollarSign,
    title: "Full Resale Rights",
    description: "PLR & MRR included. Resell products as your own and keep 100% of profits.",
    gradient: "from-emerald-500 to-teal-400",
  },
  {
    icon: Shield,
    title: "Money-Back Guarantee",
    description: "Not happy? Get a full refund within 30 days, no questions asked.",
    gradient: "from-amber-500 to-orange-400",
  },
  {
    icon: RefreshCw,
    title: "Free Lifetime Updates",
    description: "New products added regularly. Buy once, get updates forever.",
    gradient: "from-violet-500 to-purple-400",
  },
];

const FeaturesSection = () => {
  return (
    <section className="relative overflow-hidden py-28">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ repeat: Infinity, duration: 10 }}
        />
        <motion.div
          className="absolute left-0 bottom-0 h-[400px] w-[400px] rounded-full bg-accent/5 blur-[100px]"
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ repeat: Infinity, duration: 12 }}
        />
      </div>

      <div className="container mx-auto px-4">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="mb-4 inline-flex items-center gap-2 rounded-full glass-subtle px-4 py-1.5 text-sm font-medium text-primary"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Zap className="h-4 w-4" /> Why Us
          </motion.div>
          <h2 className="text-4xl font-extrabold md:text-5xl">
            Why choose{" "}
            <span className="text-gradient-static">us?</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground/70 max-w-lg mx-auto">
            100M+ products, full rights, instant access — everything you need to build your digital empire
          </p>
        </motion.div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="group relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <motion.div
                className="relative h-full overflow-hidden rounded-2xl glass p-7 transition-all duration-500 hover:border-primary/20"
                whileHover={{ y: -6 }}
              >
                {/* Glow on hover */}
                <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl" />

                {/* Gradient line top */}
                <div className={`absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r ${feature.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />

                <motion.div
                  className={`relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg`}
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <feature.icon className="h-6 w-6 text-white" />
                </motion.div>

                <h3 className="relative mt-5 text-lg font-bold">{feature.title}</h3>
                <p className="relative mt-2.5 text-sm leading-relaxed text-muted-foreground/70">
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
