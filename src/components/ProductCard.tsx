import { useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Lock, Eye, Star, BookOpen, Sparkles, Crown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { Product } from "@/lib/products";
import BookCover from "@/components/BookCover";

interface ProductCardProps {
  product: Product;
  index: number;
}

const ProductCard = ({ product, index }: ProductCardProps) => {
  const navigate = useNavigate();
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const starRating = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < product.id.length; i++) {
      hash = product.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return (Math.abs(hash) % 4) + 2;
  }, [product.id]);

  // Determine badges
  const isNew = useMemo(() => {
    if (!product.id) return false;
    // Consider "new" if created within last 7 days (hash-based for demo)
    let hash = 0;
    for (let i = 0; i < product.id.length; i++) hash = product.id.charCodeAt(i) + ((hash << 3) - hash);
    return Math.abs(hash) % 5 === 0;
  }, [product.id]);

  const isFree = product.price === 0;
  const isPaid = product.price > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.2), ease: "easeOut" }}
      viewport={{ once: true, margin: "-30px" }}
      whileHover={{ y: -4 }}
    >
      <Link to={`/book/${product.slug || product.id}`}>
        <div className="group relative rounded-2xl p-3 bg-card/80 border border-border/30 shadow-lg hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-500">
          {/* Inner box */}
          <div className="relative overflow-hidden rounded-xl bg-background/50 border border-border/20 group-hover:border-primary/20 transition-colors duration-500">
            {/* Image */}
            <div className="relative aspect-[4/5] overflow-hidden bg-muted/10 p-3">
              {product.image ? (
                <>
                  <img
                    src={product.image}
                    alt={`كتاب ${product.name}${product.category ? ` - ${product.category}` : ''}`}
                    className="w-full h-full object-contain rounded-lg transition-all duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />

                  {/* Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="absolute inset-0 overflow-hidden opacity-[0.04]">
                      {Array.from({ length: 4 }).map((_, row) =>
                        Array.from({ length: 3 }).map((_, col) => (
                          <span
                            key={`${row}-${col}`}
                            className="absolute text-foreground font-bold text-sm"
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
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-background/70 backdrop-blur-md border border-border/30">
                    <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground font-medium">محمي</span>
                  </div>

                  {/* View icon on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <motion.div
                      initial={{ scale: 0.6 }}
                      whileHover={{ scale: 1.1 }}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 backdrop-blur-sm"
                    >
                      <Eye className="h-5 w-5" />
                    </motion.div>
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

              {/* Top-right: stars + badges */}
              <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5">
                <div className="flex gap-0.5 px-2 py-1 rounded-lg bg-background/70 backdrop-blur-md border border-border/20">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-2.5 w-2.5 ${i < starRating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/20'}`}
                    />
                  ))}
                </div>
                {product.isFlashDeal && (
                  <Badge className="bg-destructive text-destructive-foreground text-[10px] px-2 py-0.5 border-0 shadow-sm">
                    ⚡ {product.dealEndsIn}h
                  </Badge>
                )}
              </div>

              {/* Top-left: discount + status badges */}
              <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5">
                {discount > 0 && (
                  <Badge className="text-[10px] font-bold px-2 py-0.5 border-0 bg-primary text-primary-foreground shadow-sm">
                    -{discount}%
                  </Badge>
                )}
                {isNew && (
                  <Badge className="text-[9px] font-bold px-2 py-0.5 border-0 bg-accent text-accent-foreground shadow-sm gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> جديد
                  </Badge>
                )}
                {isFree && (
                  <Badge className="text-[9px] font-bold px-2 py-0.5 border-0 bg-green-500/90 text-white shadow-sm">
                    مجاني
                  </Badge>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/80">
                  {product.category}
                </p>
                {isPaid && (
                  <Crown className="w-3 h-3 text-yellow-500/60" />
                )}
              </div>
              <h3 className="text-sm font-bold leading-snug line-clamp-1 text-foreground group-hover:text-primary transition-colors duration-300">
                {product.name}
              </h3>
              {product.shortDescription && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {product.shortDescription}
                </p>
              )}
              {product.pageCount && (
                <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> {product.pageCount} صفحة
                </p>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-border/20">
                <div className="flex items-baseline gap-2">
                  {product.price > 0 ? (
                    <>
                      <span className="text-base font-bold text-foreground">
                        {product.price} <span className="text-[10px] font-medium text-muted-foreground">د.م</span>
                      </span>
                      {product.originalPrice && (
                        <span className="text-[10px] text-muted-foreground/40 line-through">
                          {product.originalPrice}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-base font-bold text-green-500">مجاني</span>
                  )}
                </div>
                <span className="text-[10px] font-mono font-semibold text-muted-foreground/60 tracking-wide">
                  {product.referenceCode || product.id.slice(0, 6).toUpperCase()}
                </span>
              </div>

              {/* Read button */}
              {product.pdfUrl && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(`/read/${product.slug || product.id}`);
                  }}
                  className="mt-1 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md hover:shadow-primary/20 active:scale-[0.98] transition-all duration-200"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  مطالعة
                </button>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
