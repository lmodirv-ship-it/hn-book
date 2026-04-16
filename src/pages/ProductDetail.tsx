import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, ShoppingCart, Star, Shield, Download, Clock, Zap, Gift, Award,
  ChevronRight, ChevronLeft, Loader2, Lock, Eye, Heart, Share2, BookOpen, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookCover from "@/components/BookCover";
import ProductCard from "@/components/ProductCard";
import { bookService } from "@/services";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/products";
import { mapProductRowToProduct } from "@/lib/product-utils";

interface ProductFile {
  id: string;
  file_type: string;
  file_name: string;
  public_url: string;
  is_primary: boolean | null;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [productFiles, setProductFiles] = useState<ProductFile[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [liked, setLiked] = useState(false);
  const [hasPdf, setHasPdf] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        // Use bookService — try slug first, then UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const result = isUuid
          ? await bookService.getById(id)
          : await bookService.getBySlug(id);

        if (result.error || !result.data) {
          setError("تعذر تحميل الكتاب");
          return;
        }

        const book = result.data;
        const mapped: Product = {
          id: book.id,
          name: book.name,
          description: book.description,
          shortDescription: book.shortDescription,
          price: book.price,
          originalPrice: book.originalPrice,
          category: book.category,
          image: book.image,
          features: book.features,
          badge: book.badge,
          isFlashDeal: book.isFlashDeal,
          dealEndsIn: book.dealEndsIn,
          referenceCode: book.referenceCode,
          pdfUrl: book.pdfUrl,
          slug: book.slug,
        };
        setProduct(mapped);
        setHasPdf(!!book.pdfUrl);

        // Fetch product files (images) in parallel with related
        const [filesRes, relatedRes] = await Promise.all([
          supabase
            .from("product_files")
            .select("id, file_type, file_name, public_url, is_primary")
            .eq("product_id", book.id),
          supabase
            .from("products")
            .select("*")
            .eq("is_active", true)
            .eq("category", book.category)
            .neq("id", book.id)
            .limit(4),
        ]);

        if (filesRes.data) setProductFiles(filesRes.data);
        if (relatedRes.data) setRelatedProducts(relatedRes.data.map(mapProductRowToProduct));
      } catch (err) {
        console.error("[ProductDetail] fetch error", err);
        setError("تعذر تحميل الكتاب");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Build carousel images from product image + product_files
  const carouselImages = (() => {
    const images: { url: string; label: string }[] = [];
    if (product?.image) images.push({ url: product.image, label: "الصورة الرئيسية" });
    productFiles
      .filter(f => f.file_type === "image" && f.public_url)
      .forEach(f => {
        if (!images.some(img => img.url === f.public_url)) {
          images.push({ url: f.public_url, label: f.file_name });
        }
      });
    return images;
  })();

  const hasCarousel = carouselImages.length > 0;
  const totalSlides = hasCarousel ? carouselImages.length : 1;

  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

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
          {error ? (
            <>
              <AlertCircle className="w-16 h-16 text-destructive/50 mb-4" />
              <h1 className="text-xl font-bold text-foreground">{error}</h1>
              <p className="text-sm text-muted-foreground mt-2">تحقق من الرابط أو حاول مرة أخرى</p>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => window.location.reload()}>إعادة المحاولة</Button>
                <Button asChild><Link to="/books">تصفح الكتب</Link></Button>
              </div>
            </>
          ) : (
            <>
              <BookOpen className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h1 className="text-2xl font-bold">المنتج غير موجود</h1>
              <Button asChild className="mt-6"><Link to="/books">تصفح الكتب</Link></Button>
            </>
          )}
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border-b border-border/30 bg-card/30 backdrop-blur-sm"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">المتجر</Link>
            <ChevronRight className="h-3 w-3 rotate-180" />
            <span>{product.category}</span>
            <ChevronRight className="h-3 w-3 rotate-180" />
            <span className="text-foreground/70 truncate max-w-[200px]">{product.name}</span>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">

          {/* Left: Image Carousel */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col gap-4"
          >
            {/* Main Image Area */}
            <div className="rounded-2xl p-3 bg-black/95 border border-black/80 shadow-[0_4px_30px_-5px_rgba(0,0,0,0.9),inset_0_0_25px_-3px_hsl(199,89%,68%,0.25),inset_0_0_50px_-8px_hsl(199,89%,68%,0.1)]">
              <div className="relative overflow-hidden rounded-xl border border-[hsl(199,89%,68%,0.35)] bg-black/90 group shadow-[0_0_25px_-2px_hsl(199,89%,68%,0.4),inset_0_0_20px_-3px_hsl(199,89%,68%,0.25)]">
              <div className="aspect-[4/3] relative">
                <AnimatePresence mode="wait">
                  {hasCarousel ? (
                    <motion.div
                      key={currentSlide}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0"
                    >
                      <img
                        src={carouselImages[currentSlide].url}
                        alt={product.name}
                        className="w-full h-full object-cover blur-[2px] opacity-80"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0"
                    >
                      <BookCover
                        title={product.name}
                        category={product.category}
                        index={0}
                        className="h-full w-full"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Watermark overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center space-y-3"
                  >
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/20 backdrop-blur-md flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/10">
                      <Lock className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-white/90 drop-shadow-lg">معاينة محمية</p>
                  </motion.div>
                </div>

                {/* Repeating watermark pattern */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.06] z-10">
                  {Array.from({ length: 6 }).map((_, row) =>
                    Array.from({ length: 4 }).map((_, col) => (
                      <span
                        key={`${row}-${col}`}
                        className="absolute font-bold text-lg"
                        style={{
                          top: `${15 + row * 16}%`,
                          left: `${5 + col * 28}%`,
                          transform: "rotate(-30deg)",
                          whiteSpace: "nowrap",
                          color: "white",
                        }}
                      >
                        HN BOOK
                      </span>
                    ))
                  )}
                </div>

                {/* Carousel controls */}
                {totalSlides > 1 && (
                  <>
                    <button
                      onClick={prevSlide}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                      {carouselImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentSlide(i)}
                          className={`rounded-full transition-all ${
                            i === currentSlide
                              ? "w-6 h-2 bg-primary"
                              : "w-2 h-2 bg-white/40 hover:bg-white/60"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Flash deal banner */}
                {product.isFlashDeal && (
                  <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="absolute top-4 right-4 left-4 z-20"
                  >
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/90 backdrop-blur-sm px-4 py-2 text-destructive-foreground">
                      <Zap className="h-4 w-4" />
                      <span className="text-sm font-semibold">عرض خاص — ينتهي خلال {product.dealEndsIn} ساعة</span>
                    </div>
                  </motion.div>
                )}

                {/* Like & Share */}
                <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setLiked(!liked)}
                    className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                      liked ? "bg-red-500/80 text-white" : "bg-black/30 text-white/70 hover:bg-black/50"
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${liked ? "fill-white" : ""}`} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/70 hover:bg-black/50 transition-all"
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                    }}
                  >
                    <Share2 className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
              </div>
            </div>

            {/* Thumbnail strip */}
            {carouselImages.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex gap-2 overflow-x-auto pb-1"
              >
                {carouselImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      i === currentSlide
                        ? "border-primary ring-2 ring-primary/20 scale-105"
                        : "border-border/30 opacity-60 hover:opacity-90"
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </motion.div>
            )}

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-3 gap-3"
            >
              {[
                { icon: Download, label: "تحميل فوري", sub: "بعد الشراء مباشرة" },
                { icon: Shield, label: "ضمان استرداد", sub: "30 يوم" },
                { icon: Award, label: "حقوق كاملة", sub: "ترخيص تجاري" },
              ].map(({ icon: Icon, label, sub }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border/30 bg-card/50 p-3 text-center hover:border-primary/20 hover:bg-primary/5 transition-colors cursor-default"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground/80">{label}</span>
                  <span className="text-[10px] text-muted-foreground">{sub}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Details */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="flex flex-col"
          >
            {/* Badges */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center gap-2"
            >
              <Badge variant="secondary" className="text-xs">{product.category}</Badge>
              {product.badge && (
                <Badge className="bg-primary/15 text-primary border-primary/20 text-xs">{product.badge}</Badge>
              )}
              {discount > 40 && (
                <Badge className="bg-destructive/15 text-destructive border-destructive/20 text-xs animate-pulse">
                  🔥 خصم {discount}%
                </Badge>
              )}
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-4 text-2xl font-bold leading-tight md:text-3xl lg:text-4xl text-foreground"
            >
              {product.name}
            </motion.h1>

            {/* Rating */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-3 flex items-center gap-2"
            >
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 transition-colors ${i < Math.floor(Number(rating)) ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"}`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-foreground/80">{rating}</span>
              <span className="text-sm text-muted-foreground">({reviewCount} تقييم)</span>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base whitespace-pre-line"
            >
              {product.description}
            </motion.p>

            <Separator className="my-6" />

            {/* Pricing Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl border border-border/40 bg-gradient-to-b from-card/80 to-card/40 p-6 backdrop-blur-sm relative overflow-hidden"
            >
              {/* Glow effect */}
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

              <div className="flex items-end gap-3 relative">
                {product.price > 0 ? (
                  <>
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                      className="text-4xl font-extrabold text-foreground"
                    >
                      {product.price} د.م
                    </motion.span>
                    {product.originalPrice && (
                      <span className="text-lg text-muted-foreground/60 line-through mb-1">
                        {product.originalPrice} د.م
                      </span>
                    )}
                  </>
                ) : (
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="text-4xl font-extrabold text-primary"
                  >
                    مجاني
                  </motion.span>
                )}
                {discount > 0 && (
                  <motion.span
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mb-1 rounded-lg bg-primary/15 px-3 py-1 text-sm font-bold text-primary"
                  >
                    وفر {discount}%
                  </motion.span>
                )}
              </div>

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="space-y-3 mt-5"
              >
                {product.price > 0 ? (
                  <Button
                    size="lg"
                    className="w-full gap-2.5 text-base font-semibold h-14 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    اشترِ الآن — {product.price} د.م
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="w-full gap-2.5 text-base font-semibold h-14 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
                    asChild
                  >
                    <Link to={`/read/${product.id}`}>
                      <BookOpen className="h-5 w-5" />
                      اقرأ الآن مجاناً
                    </Link>
                  </Button>
                )}
              </motion.div>

              {/* Read / Preview button - only for PDFs */}
              {hasPdf && product.price > 0 && (
                <Button
                  variant="outline"
                  size="lg"
                  className="mt-3 w-full gap-2.5 text-base font-semibold h-12 rounded-xl border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 transition-all"
                  asChild
                >
                  <Link to={`/read/${product.id}`}>
                    <BookOpen className="h-5 w-5" />
                    مطالعة الكتاب
                  </Link>
                </Button>
              )}

              {/* No PDF warning */}
              {!hasPdf && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  هذا الكتاب غير متوفر للقراءة حالياً
                </div>
              )}

              {/* Sub-info */}
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> دفع آمن</span>
                <span className="flex items-center gap-1"><Download className="h-3 w-3" /> تحميل فوري</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> وصول مدى الحياة</span>
              </div>
            </motion.div>

            <Separator className="my-6" />

            {/* What's Included */}
            {product.features.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Gift className="h-5 w-5 text-primary" />
                  ما يتضمنه المنتج
                </h3>
                <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {product.features.map((feature, i) => (
                    <motion.li
                      key={feature}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.65 + i * 0.05 }}
                      className="flex items-center gap-2.5 text-sm text-foreground/80"
                    >
                      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      {feature}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* FAQ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-8 rounded-2xl border border-border/30 bg-card/40 p-5"
            >
              <h4 className="font-semibold text-foreground text-sm">أسئلة شائعة</h4>
              <div className="mt-3 space-y-3">
                {[
                  { q: "كيف أحصل على المنتج بعد الشراء؟", a: "رابط التحميل يُرسل فوراً إلى بريدك الإلكتروني بعد إتمام الدفع." },
                  { q: "هل يمكنني إعادة بيع المنتج؟", a: "نعم! الترخيص التجاري مشمول. يمكنك إعادة البيع والاحتفاظ بكامل الأرباح." },
                  { q: "هل هناك ضمان استرداد؟", a: "ضمان استرداد كامل خلال 30 يوماً بدون أي أسئلة." },
                ].map(({ q, a }, i) => (
                  <motion.div
                    key={q}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.75 + i * 0.05 }}
                  >
                    <p className="text-xs font-medium text-foreground/80">{q}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: "-50px" }}
            className="mt-16 lg:mt-24"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">منتجات مشابهة</h2>
              <Link to="/" className="text-sm text-primary hover:underline flex items-center gap-1">
                عرض الكل
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {relatedProducts.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <ProductCard product={p} index={i} />
                </motion.div>
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
