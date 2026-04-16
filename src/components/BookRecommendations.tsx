import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Clock } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { recommendationService } from "@/services/recommendationService";
import type { Product } from "@/lib/products";

interface Props {
  bookId?: string;
  category?: string;
  title?: string;
  type?: "similar" | "popular" | "newest";
  limit?: number;
}

const ICONS = {
  similar: Sparkles,
  popular: TrendingUp,
  newest: Clock,
};

const TITLES = {
  similar: "كتب مشابهة",
  popular: "الأكثر شعبية",
  newest: "أحدث الكتب",
};

const BookRecommendations = ({ bookId, category, title, type = "popular", limit = 4 }: Props) => {
  const [books, setBooks] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let result;
      if (type === "similar" && bookId && category) {
        result = await recommendationService.getSimilar(bookId, category, limit);
      } else if (type === "popular") {
        result = await recommendationService.getPopular(limit);
      } else {
        result = await recommendationService.getNewest(limit);
      }
      if (result.data) setBooks(result.data);
      setLoading(false);
    };
    fetch();
  }, [bookId, category, type, limit]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 bg-muted/20 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-muted/10 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (books.length === 0) return null;

  const Icon = ICONS[type];
  const displayTitle = title || TITLES[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true, margin: "-50px" }}
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground">{displayTitle}</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {books.map((book, i) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            viewport={{ once: true }}
          >
            <ProductCard product={book} index={i} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default BookRecommendations;
