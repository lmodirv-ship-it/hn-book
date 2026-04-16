import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, ArrowLeft, BookOpen, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";

const CartPage = () => {
  const { items, removeItem, clearCart, totalPrice, itemCount } = useCart();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen noise-bg" dir="rtl">
      <div className="relative z-10 pt-14">
        <Navbar categories={[]} activeCategory="" onCategorySelect={() => {}} productCounts={{}} />

        <section className="py-10 sm:py-14">
          <div className="container mx-auto px-4 max-w-4xl">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between mb-8"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-foreground">سلة التسوق</h1>
                  <p className="text-xs text-muted-foreground">{itemCount} عنصر</p>
                </div>
              </div>
              {items.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive text-xs gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> إفراغ السلة
                </Button>
              )}
            </motion.div>

            {items.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20 space-y-4"
              >
                <div className="w-20 h-20 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-9 h-9 text-muted-foreground/40" />
                </div>
                <h2 className="text-lg font-bold text-foreground">السلة فارغة</h2>
                <p className="text-sm text-muted-foreground">تصفح مكتبتنا وأضف كتباً إلى سلتك</p>
                <Button asChild className="rounded-xl gap-2 mt-2">
                  <Link to="/books">
                    <BookOpen className="w-4 h-4" /> تصفح الكتب
                  </Link>
                </Button>
              </motion.div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Items */}
                <div className="lg:col-span-2 space-y-3">
                  <AnimatePresence>
                    {items.map((item, i) => (
                      <motion.div
                        key={item.bookId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, height: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-4 p-4 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm hover:border-border/50 transition-colors"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-20 rounded-lg object-cover border border-border/20"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-foreground truncate">{item.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
                          {item.referenceCode && (
                            <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">{item.referenceCode}</p>
                          )}
                        </div>
                        <div className="text-left flex-shrink-0">
                          <p className="text-sm font-bold text-foreground">
                            {item.price > 0 ? `${item.price} د.م` : "مجاني"}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.bookId)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Summary */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-5 h-fit sticky top-20 space-y-4"
                >
                  <h3 className="font-bold text-foreground text-sm">ملخص الطلب</h3>
                  <Separator className="bg-border/20" />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>عدد الكتب</span>
                      <span className="font-semibold text-foreground">{itemCount}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>المجموع الفرعي</span>
                      <span className="font-semibold text-foreground">{totalPrice} د.م</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>التوصيل</span>
                      <span className="text-xs text-green-500 font-semibold">مجاني</span>
                    </div>
                  </div>
                  <Separator className="bg-border/20" />
                  <div className="flex justify-between font-bold text-foreground">
                    <span>الإجمالي</span>
                    <span className="text-primary text-lg">{totalPrice} د.م</span>
                  </div>
                  <Button
                    className="w-full rounded-xl h-12 gap-2 text-sm font-semibold shadow-lg shadow-primary/20"
                    onClick={() => navigate("/checkout")}
                  >
                    <ArrowLeft className="w-4 h-4" /> إتمام الطلب
                  </Button>
                  <Button variant="outline" asChild className="w-full rounded-xl gap-2 text-xs">
                    <Link to="/books">
                      <BookOpen className="w-3.5 h-3.5" /> متابعة التسوق
                    </Link>
                  </Button>
                </motion.div>
              </div>
            )}
          </div>
        </section>
        <Footer />
      </div>
    </div>
  );
};

export default CartPage;
