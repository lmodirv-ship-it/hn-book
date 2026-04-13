import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import type { Product } from "@/lib/products";
import { useRef } from "react";

interface ProductCardProps {
  product: Product;
  index: number;
}

const ProductCard = ({ product, index }: ProductCardProps) => {
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 });
  const glareX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), { stiffness: 200, damping: 20 });
  const glareY = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), { stiffness: 200, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.6,
        delay: index * 0.12,
        type: "spring",
        stiffness: 100,
      }}
      viewport={{ once: true, margin: "-50px" }}
    >
      <Link to={`/product/${product.id}`}>
        <motion.div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            rotateX,
            rotateY,
            transformPerspective: 800,
          }}
          className="group relative cursor-pointer"
        >
          {/* Animated border glow */}
          <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary via-accent to-primary opacity-0 blur-sm transition-opacity duration-500 group-hover:opacity-75" />

          <div className="relative overflow-hidden rounded-xl border bg-card shadow-lg transition-shadow duration-500 group-hover:shadow-2xl">
            {/* Holographic glare effect */}
            <motion.div
              className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-30"
              style={{
                background: useTransform(
                  [glareX, glareY],
                  ([x, y]) =>
                    `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.8) 0%, transparent 50%)`
                ),
              }}
            />

            {/* Image */}
            <div className="relative aspect-[3/2] overflow-hidden">
              <motion.img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
                loading="lazy"
                width={800}
                height={544}
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />

              {/* Flash overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              {/* Badges with pulse animation */}
              {product.badge && (
                <motion.div
                  className="absolute left-3 top-3"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Badge className="bg-primary text-primary-foreground shadow-lg">
                    <Zap className="mr-1 h-3 w-3" />
                    {product.badge}
                  </Badge>
                </motion.div>
              )}

              {discount > 0 && (
                <motion.div
                  className="absolute right-3 top-3"
                  initial={{ rotate: -12 }}
                  animate={{ rotate: [-12, 0, -12] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                >
                  <Badge variant="destructive" className="text-sm font-bold shadow-lg">
                    -{discount}%
                  </Badge>
                </motion.div>
              )}

              {/* Hover price flash */}
              <motion.div
                className="absolute bottom-3 left-3 right-3 flex items-end justify-between opacity-0 transition-all duration-500 group-hover:opacity-100"
              >
                <span className="text-3xl font-bold text-primary-foreground drop-shadow-lg">
                  ${product.price}
                </span>
                <Button
                  size="sm"
                  className="gap-1.5 shadow-xl"
                >
                  <ShoppingCart className="h-4 w-4" /> Buy Now
                </Button>
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-5">
              <motion.p
                className="text-xs font-bold uppercase tracking-widest text-primary"
                initial={{ width: 0 }}
                whileInView={{ width: "100%" }}
                transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
                viewport={{ once: true }}
              >
                {product.category}
              </motion.p>

              <h3 className="mt-2 text-lg font-bold leading-tight transition-colors group-hover:text-primary">
                {product.name}
              </h3>

              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {product.shortDescription}
              </p>

              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black">${product.price}</span>
                  {product.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      ${product.originalPrice}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                  Instant Download
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
