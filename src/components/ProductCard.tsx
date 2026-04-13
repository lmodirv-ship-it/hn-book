import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Lock, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import type { Product } from "@/lib/products";
import BookCover from "@/components/BookCover";

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
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.25) }}
      viewport={{ once: true, margin: "-30px" }}
    >
      <Link to={`/product/${product.id}`}>
        <div className="group relative overflow-hidden rounded-2xl glass-card transition-all duration-500 glass-card-hover">
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden bg-muted/20">
            {product.image ? (
              <>
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
                  loading="lazy"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="absolute inset-0 overflow-hidden opacity-[0.05]">
                    {Array.from({ length: 4 }).map((_, row) =>
                      Array.from({ length: 3 }).map((_, col) => (
                        <span
                          key={`${row}-${col}`}
                          className="absolute text-white font-bold text-sm"
                          style={{
                            top: `${10 + row * 25}%`,
                            left: `${5 + col * 35}%`,
                            transform: "rotate(-30deg)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          HN BOOK
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Protected badge */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-background/60 backdrop-blur-md border border-border/30">
                  <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground font-medium">محمي</span>
                </div>

                {/* View icon on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-glow backdrop-blur-sm scale-75 group-hover:scale-100 transition-transform duration-500">
                    <Eye className="h-5 w-5" />
                  </div>
                </div>
              </>
            ) : (
              <BookCover
                title={product.name}
                category={product.category}
                index={index}
                className="h-full w-full"
              />
            )}

            {/* Badges */}
            <div className="absolute right-2 top-2 flex gap-1.5">
              {product.badge && (
                <Badge className="bg-accent/90 text-accent-foreground text-[10px] px-2.5 py-0.5 border-0 font-semibold backdrop-blur-sm">
                  {product.badge}
                </Badge>
              )}
              {product.isFlashDeal && (
                <Badge className="bg-destructive/90 text-destructive-foreground text-[10px] px-2.5 py-0.5 border-0 backdrop-blur-sm">
                  ⚡ {product.dealEndsIn}h
                </Badge>
              )}
            </div>

            {discount > 0 && (
              <div className="absolute left-2 top-2">
                <Badge className="text-[10px] font-bold px-2.5 py-0.5 border-0 bg-primary/80 text-primary-foreground backdrop-blur-sm">
                  -{discount}%
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/60">
              {product.category}
            </p>
            <h3 className="mt-1.5 text-sm font-semibold leading-snug line-clamp-1 text-foreground/90 group-hover:text-foreground transition-colors">
              {product.name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground/70 line-clamp-1">
              {product.shortDescription}
            </p>

            <div className="mt-3 flex items-center justify-between pt-3 border-t border-border/20">
              <div className="flex items-baseline gap-2">
                {product.price > 0 ? (
                  <>
                    <span className="text-base font-bold text-foreground">
                      {product.price} <span className="text-xs font-medium text-muted-foreground">د.م</span>
                    </span>
                    {product.originalPrice && (
                      <span className="text-[11px] text-muted-foreground/40 line-through">
                        {product.originalPrice}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-base font-bold text-accent">مجاني</span>
                )}
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/30 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:bg-primary/10 group-hover:text-primary">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
