import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, ShoppingCart, Star, Shield, Download, Clock, Zap, Gift, Award, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookCover from "@/components/BookCover";
import ProductCard from "@/components/ProductCard";
import { getProduct, products } from "@/lib/products";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const product = getProduct(id || "");

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto flex flex-col items-center justify-center px-4 py-32">
          <h1 className="text-2xl font-bold">Product not found</h1>
          <Button asChild className="mt-6">
            <Link to="/">Back to Store</Link>
          </Button>
        </div>
      </div>
    );
  }

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const productIndex = products.indexOf(product);
  const reviewCount = Math.floor(50 + (productIndex * 17) % 200);
  const rating = (4.5 + (productIndex % 5) * 0.1).toFixed(1);

  // Related products from same category
  const related = products
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Breadcrumb */}
      <div className="border-b border-border/30 bg-card/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Store</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-muted-foreground">{product.category}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground/70 truncate max-w-[200px]">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">

          {/* Left: Book Cover */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-4"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/40">
              <div className="aspect-[4/3]">
                <BookCover
                  title={product.name}
                  category={product.category}
                  index={productIndex}
                  className="h-full w-full"
                />
              </div>

              {/* Flash deal banner */}
              {product.isFlashDeal && (
                <div className="absolute top-4 left-4 right-4">
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/90 backdrop-blur-sm px-4 py-2 text-destructive-foreground">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm font-semibold">Flash Deal — Ends in {product.dealEndsIn}h</span>
                  </div>
                </div>
              )}
            </div>

            {/* Trust badges under image */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Download, label: "Instant Download", sub: "Get it now" },
                { icon: Shield, label: "Money Back", sub: "30-day guarantee" },
                { icon: Award, label: "PLR/MRR Rights", sub: "Resell as yours" },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl border border-border/30 bg-card/50 p-3 text-center">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-[11px] font-semibold text-foreground/80">{label}</span>
                  <span className="text-[10px] text-muted-foreground">{sub}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-col"
          >
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">{product.category}</Badge>
              {product.badge && (
                <Badge className="bg-primary/15 text-primary border-primary/20 text-xs">{product.badge}</Badge>
              )}
              {discount > 40 && (
                <Badge className="bg-destructive/15 text-destructive border-destructive/20 text-xs">
                  🔥 {discount}% OFF
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="mt-4 text-2xl font-bold leading-tight md:text-3xl lg:text-4xl text-foreground">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < Math.floor(Number(rating)) ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"}`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-foreground/80">{rating}</span>
              <span className="text-sm text-muted-foreground">({reviewCount} reviews)</span>
            </div>

            {/* Description */}
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              {product.description}
            </p>

            <Separator className="my-6" />

            {/* Pricing */}
            <div className="rounded-xl border border-border/40 bg-card/60 p-5">
              <div className="flex items-end gap-3">
                <span className="text-4xl font-extrabold text-foreground">${product.price}</span>
                {product.originalPrice && (
                  <span className="text-lg text-muted-foreground/60 line-through mb-1">
                    ${product.originalPrice}
                  </span>
                )}
                {discount > 0 && (
                  <span className="mb-1 rounded-md bg-primary/15 px-2 py-0.5 text-sm font-bold text-primary">
                    Save {discount}%
                  </span>
                )}
              </div>

              {/* Buy button */}
              <Button
                size="lg"
                className="mt-5 w-full gap-2.5 text-base font-semibold h-14 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                <ShoppingCart className="h-5 w-5" />
                Buy Now — ${product.price}
              </Button>

              {/* Read Online button */}
              <Button
                asChild
                size="lg"
                variant="outline"
                className="mt-3 w-full gap-2.5 text-base font-semibold h-12 rounded-xl border-primary/30 text-primary hover:bg-primary/10 transition-all"
              >
                <Link to={`/read/${product.id}`}>
                  <BookOpen className="h-5 w-5" />
                  📖 اقرأ الكتاب الآن
                </Link>
              </Button>

              {/* Sub-info */}
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Secure checkout</span>
                <span className="flex items-center gap-1"><Download className="h-3 w-3" /> Instant access</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Lifetime updates</span>
              </div>
            </div>

            <Separator className="my-6" />

            {/* What's Included */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Gift className="h-5 w-5 text-primary" />
                What's Included
              </h3>
              <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm text-foreground/80">
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* FAQ mini */}
            <div className="mt-8 rounded-xl border border-border/30 bg-card/40 p-5">
              <h4 className="font-semibold text-foreground text-sm">Frequently Asked</h4>
              <div className="mt-3 space-y-3">
                {[
                  { q: "Can I resell this product?", a: "Yes! Full PLR/MRR rights included. Resell and keep 100% profits." },
                  { q: "How do I access my purchase?", a: "Instant download link sent to your email immediately after purchase." },
                  { q: "Is there a refund policy?", a: "30-day money-back guarantee. No questions asked." },
                ].map(({ q, a }) => (
                  <div key={q}>
                    <p className="text-xs font-medium text-foreground/80">{q}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mt-16 lg:mt-24"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Related Products</h2>
              <Link to="/" className="text-sm text-primary hover:underline">View all →</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={products.indexOf(p)} />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default ProductDetail;
