import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Check, ShoppingCart, Star, Shield, Download, Clock, Zap, Gift, Award,
  ChevronRight, Loader2, Lock, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookCover from "@/components/BookCover";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/products";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (data) {
        const mapped: Product = {
          id: data.id,
          name: data.name,
          description: data.description || "",
          shortDescription: data.short_description || "",
          price: Number(data.price),
          originalPrice: data.original_price ? Number(data.original_price) : undefined,
          category: data.category,
          image: data.image || "",
          features: data.features || [],
          badge: data.badge || undefined,
          isFlashDeal: data.is_flash_deal || false,
          dealEndsIn: data.deal_ends_in || undefined,
        };
        setProduct(mapped);

        // Fetch related products
        const { data: related } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .eq("category", data.category)
          .neq("id", data.id)
          .limit(4);

        if (related) {
          setRelatedProducts(
            related.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description || "",
              shortDescription: p.short_description || "",
              price: Number(p.price),
              originalPrice: p.original_price ? Number(p.original_price) : undefined,
              category: p.category,
              image: p.image || "",
              features: p.features || [],
              badge: p.badge || undefined,
              isFlashDeal: p.is_flash_deal || false,
              dealEndsIn: p.deal_ends_in || undefined,
            }))
          );
        }
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto flex flex-col items-center justify-center px-4 py-32">
          <h1 className="text-2xl font-bold">المنتج غير موجود</h1>
          <Button asChild className="mt-6">
            <Link to="/">العودة للمتجر</Link>
          </Button>
        </div>
      </div>
    );
  }

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const reviewCount = Math.floor(50 + (product.name.length * 7) % 200);
  const rating = (4.5 + (product.name.length % 5) * 0.1).toFixed(1);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />

      {/* Breadcrumb */}
      <div className="border-b border-border/30 bg-card/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">المتجر</Link>
            <ChevronRight className="h-3 w-3 rotate-180" />
            <span>{product.category}</span>
            <ChevronRight className="h-3 w-3 rotate-180" />
            <span className="text-foreground/70 truncate max-w-[200px]">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">

          {/* Left: Product Preview with watermark */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-4"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/40">
              <div className="aspect-[4/3] relative">
                {product.image ? (
                  <>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover blur-[2px] opacity-80"
                    />
                    {/* Watermark overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="text-center space-y-3">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/30">
                          <Lock className="w-7 h-7 text-primary" />
                        </div>
                        <p className="text-sm font-semibold text-white/90 drop-shadow-lg">معاينة محمية</p>
                      </div>
                    </div>
                    {/* Repeating watermark pattern */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.08]">
                      {Array.from({ length: 6 }).map((_, row) =>
                        Array.from({ length: 4 }).map((_, col) => (
                          <span
                            key={`${row}-${col}`}
                            className="absolute text-white font-bold text-lg"
                            style={{
                              top: `${15 + row * 16}%`,
                              left: `${5 + col * 28}%`,
                              transform: "rotate(-30deg)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            HN BOOK
                          </span>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <BookCover
                    title={product.name}
                    category={product.category}
                    index={0}
                    className="h-full w-full"
                  />
                )}
              </div>

              {/* Flash deal banner */}
              {product.isFlashDeal && (
                <div className="absolute top-4 right-4 left-4">
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/90 backdrop-blur-sm px-4 py-2 text-destructive-foreground">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm font-semibold">عرض خاص — ينتهي خلال {product.dealEndsIn} ساعة</span>
                  </div>
                </div>
              )}
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Download, label: "تحميل فوري", sub: "بعد الشراء مباشرة" },
                { icon: Shield, label: "ضمان استرداد", sub: "30 يوم" },
                { icon: Award, label: "حقوق كاملة", sub: "ترخيص تجاري" },
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
                  🔥 خصم {discount}%
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
              <span className="text-sm text-muted-foreground">({reviewCount} تقييم)</span>
            </div>

            {/* Description */}
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base whitespace-pre-line">
              {product.description}
            </p>

            <Separator className="my-6" />

            {/* Pricing */}
            <div className="rounded-xl border border-border/40 bg-card/60 p-5">
              <div className="flex items-end gap-3">
                {product.price > 0 ? (
                  <>
                    <span className="text-4xl font-extrabold text-foreground">{product.price} د.م</span>
                    {product.originalPrice && (
                      <span className="text-lg text-muted-foreground/60 line-through mb-1">
                        {product.originalPrice} د.م
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-4xl font-extrabold text-primary">مجاني</span>
                )}
                {discount > 0 && (
                  <span className="mb-1 rounded-md bg-primary/15 px-2 py-0.5 text-sm font-bold text-primary">
                    وفر {discount}%
                  </span>
                )}
              </div>

              {/* Buy button */}
              <Button
                size="lg"
                className="mt-5 w-full gap-2.5 text-base font-semibold h-14 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                <ShoppingCart className="h-5 w-5" />
                {product.price > 0 ? `اشترِ الآن — ${product.price} د.م` : "احصل عليه مجاناً"}
              </Button>

              {/* Preview button (no download) */}
              <Button
                variant="outline"
                size="lg"
                className="mt-3 w-full gap-2.5 text-base font-semibold h-12 rounded-xl border-border/40 text-muted-foreground"
                disabled
              >
                <Eye className="h-5 w-5" />
                التحميل متاح بعد الشراء فقط
              </Button>

              {/* Sub-info */}
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> دفع آمن</span>
                <span className="flex items-center gap-1"><Download className="h-3 w-3" /> تحميل فوري</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> وصول مدى الحياة</span>
              </div>
            </div>

            <Separator className="my-6" />

            {/* What's Included */}
            {product.features.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Gift className="h-5 w-5 text-primary" />
                  ما يتضمنه المنتج
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
            )}

            {/* FAQ */}
            <div className="mt-8 rounded-xl border border-border/30 bg-card/40 p-5">
              <h4 className="font-semibold text-foreground text-sm">أسئلة شائعة</h4>
              <div className="mt-3 space-y-3">
                {[
                  { q: "كيف أحصل على المنتج بعد الشراء؟", a: "رابط التحميل يُرسل فوراً إلى بريدك الإلكتروني بعد إتمام الدفع." },
                  { q: "هل يمكنني إعادة بيع المنتج؟", a: "نعم! الترخيص التجاري مشمول. يمكنك إعادة البيع والاحتفاظ بكامل الأرباح." },
                  { q: "هل هناك ضمان استرداد؟", a: "ضمان استرداد كامل خلال 30 يوماً بدون أي أسئلة." },
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
        {relatedProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mt-16 lg:mt-24"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">منتجات مشابهة</h2>
              <Link to="/" className="text-sm text-primary hover:underline">عرض الكل ←</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {relatedProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
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