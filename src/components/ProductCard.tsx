import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Lock } from "lucide-react";
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
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.2) }}
      viewport={{ once: true, margin: "-30px" }}
    >
      <Link to={`/product/${product.id}`}>
        <div className="group relative overflow-hidden rounded-xl border border-border/40 bg-card/60 transition-all duration-300 hover:border-primary/20 hover:bg-card/90">
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden bg-muted/30">
            {product.image ? (
              <>
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Watermark overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="absolute inset-0 overflow-hidden opacity-[0.07]">
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
                  {/* Small lock badge */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm">
                    <Lock className="w-2.5 h-2.5 text-white/70" />
                    <span className="text-[9px] text-white/70 font-medium">محمي</span>
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

            {/* Top badges */}
            <div className="absolute right-2 top-2 flex gap-1.5">
              {product.badge && (
                <Badge className="bg-primary/90 text-primary-foreground text-[10px] px-2 py-0.5 border-0 font-medium">
                  {product.badge}
                </Badge>
              )}
              {product.isFlashDeal && (
                <Badge className="bg-destructive/90 text-destructive-foreground text-[10px] px-2 py-0.5 border-0">
                  ⚡ {product.dealEndsIn}h
                </Badge>
              )}
            </div>

            {discount > 0 && (
              <div className="absolute left-2 top-2">
                <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 border-0 bg-background/80 backdrop-blur-sm text-primary">
                  -{discount}%
                </Badge>
              </div>
            )}

            {/* Hover arrow */}
            <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/90 text-primary-foreground opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>

          {/* Content */}
          <div className="p-3.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-primary/70">
              {product.category}
            </p>
            <h3 className="mt-1 text-sm font-semibold leading-tight line-clamp-1 text-foreground/90 group-hover:text-foreground">
              {product.name}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
              {product.shortDescription}
            </p>

            {/* Price */}
            <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-3">
              <div className="flex items-baseline gap-1.5">
                {product.price > 0 ? (
                  <>
                    <span className="text-base font-bold text-foreground">
                      {product.price} د.م
                    </span>
                    {product.originalPrice && (
                      <span className="text-[11px] text-muted-foreground/50 line-through">
                        {product.originalPrice} د.م
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-base font-bold text-primary">مجاني</span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground/50">
                تحميل فوري
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;