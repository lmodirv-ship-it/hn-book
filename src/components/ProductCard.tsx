import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
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
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
      viewport={{ once: true, margin: "-20px" }}
    >
      <Link to={`/product/${product.id}`}>
        <div className="group relative cursor-pointer overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
          {/* Image */}
          <div className="relative aspect-[3/2] overflow-hidden bg-muted">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              width={400}
              height={272}
            />

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            {/* Badges */}
            {product.badge && (
              <div className="absolute left-2 top-2">
                <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                  {product.badge}
                </Badge>
              </div>
            )}

            {discount > 0 && (
              <div className="absolute right-2 top-2">
                <Badge variant="destructive" className="text-[10px] font-bold px-2 py-0.5">
                  -{discount}%
                </Badge>
              </div>
            )}

            {product.isFlashDeal && (
              <div className="absolute bottom-2 left-2">
              <Badge className="bg-destructive text-destructive-foreground text-[10px] px-2 py-0.5 animate-pulse">
                  ⚡ {product.dealEndsIn}h left
                </Badge>
              </div>
            )}

            {/* Buy button on hover */}
            <div className="absolute bottom-2 right-2 opacity-0 transition-all duration-300 group-hover:opacity-100">
              <button className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg">
                <ShoppingCart className="h-3 w-3" /> Buy
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              {product.category}
            </p>
            <h3 className="mt-1 text-sm font-bold leading-tight line-clamp-1 transition-colors group-hover:text-primary">
              {product.name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
              {product.shortDescription}
            </p>

            {/* Price */}
            <div className="mt-2 flex items-center justify-between border-t pt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-primary">
                  ${product.price}
                </span>
                {product.originalPrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    ${product.originalPrice}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
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
