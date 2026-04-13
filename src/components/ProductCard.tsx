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
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.15) }}
      viewport={{ once: true, margin: "-20px" }}
    >
      <Link to={`/product/${product.id}`}>
        {/* Outer box - black glossy */}
        <div className="group relative rounded-2xl p-3 bg-black/95 border border-black/80 shadow-[0_4px_30px_-5px_rgba(0,0,0,0.9),inset_0_0_25px_-3px_hsl(42,75%,65%,0.25),inset_0_0_50px_-8px_hsl(42,75%,65%,0.1)]">
          {/* Inner box */}
          <div className="relative overflow-hidden rounded-xl bg-black/90 border border-[hsl(42,75%,65%,0.5)] shadow-[0_0_35px_0px_hsl(42,75%,65%,0.55),0_0_60px_-5px_hsl(42,75%,65%,0.3),inset_0_0_25px_-2px_hsl(42,75%,65%,0.35)]">
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
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-primary/20">
                    <Lock className="w-2.5 h-2.5 text-primary/60" />
                    <span className="text-[9px] text-primary/60 font-medium">محمي</span>
                  </div>

                  {/* View icon on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-[0_0_20px_-2px_hsl(199,89%,48%,0.5)] backdrop-blur-sm scale-75 group-hover:scale-100 transition-transform duration-500">
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

            {/* Content - inside inner box */}
            <div className="p-4 bg-gradient-to-b from-primary/5 to-transparent">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/60">
                {product.category}
              </p>
              <h3 className="mt-1.5 text-sm font-semibold leading-snug line-clamp-1 text-foreground/90 group-hover:text-foreground transition-colors">
                {product.name}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground/70 line-clamp-1">
                {product.shortDescription}
              </p>

              <div className="mt-3 flex items-center justify-between pt-3 border-t border-primary/10">
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
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary/50 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:text-primary group-hover:shadow-[0_0_10px_-2px_hsl(199,89%,48%,0.3)]">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
