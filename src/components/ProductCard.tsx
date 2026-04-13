import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Product } from "@/lib/products";

interface ProductCardProps {
  product: Product;
  index: number;
}

const ProductCard = ({ product, index }: ProductCardProps) => {
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.25) }}
      viewport={{ once: true, margin: "-20px" }}
    >
      <Link to={`/product/${product.id}`}>
        <div className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-500 hover:shadow-glow hover:border-primary/20 hover:-translate-y-1.5">
          {/* Image */}
          <div className="relative aspect-[3/2] overflow-hidden bg-muted">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
              width={400}
              height={272}
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            {/* Badges */}
            {product.badge && (
              <div className="absolute left-2 top-2">
                <Badge className="bg-primary/90 text-primary-foreground text-[10px] px-2 py-0.5 backdrop-blur-sm border-0 shadow-lg">
                  {product.badge}
                </Badge>
              </div>
            )}

            {discount > 0 && (
              <div className="absolute right-2 top-2">
                <Badge variant="destructive" className="text-[10px] font-bold px-2 py-0.5 shadow-lg border-0">
                  -{discount}%
                </Badge>
              </div>
            )}

            {product.isFlashDeal && (
              <div className="absolute bottom-2 left-2">
                <Badge className="bg-destructive/90 text-destructive-foreground text-[10px] px-2 py-0.5 animate-pulse border-0 shadow-lg">
                  ⚡ {product.dealEndsIn}h left
                </Badge>
              </div>
            )}

            {/* Quick action */}
            <div className="absolute bottom-2 right-2 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
              <button className="flex items-center gap-1.5 rounded-xl bg-primary/90 px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow backdrop-blur-sm border-0">
                <ShoppingCart className="h-3 w-3" /> Buy
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                {product.category}
              </p>
              <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:text-primary" />
            </div>
            <h3 className="mt-1.5 text-sm font-bold leading-tight line-clamp-1 transition-colors group-hover:text-primary">
              {product.name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground/70 line-clamp-1">
              {product.shortDescription}
            </p>

            {/* Price */}
            <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold text-gradient-static">
                  ${product.price}
                </span>
                {product.originalPrice && (
                  <span className="text-[11px] text-muted-foreground/60 line-through">
                    ${product.originalPrice}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                Instant
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
