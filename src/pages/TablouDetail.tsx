import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { tablouService, TABLOU_CATEGORIES, SIZE_LABELS, type Tablou } from "@/services/tablouService";
import { ShoppingCart, Check, Frame, Minus, Plus } from "lucide-react";

const TablouDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [tablou, setTablou] = useState<Tablou | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  useEffect(() => {
    if (!id) return;
    tablouService.getById(id).then(data => {
      setTablou(data);
      if (data?.sizes?.length) setSelectedSize(data.sizes[0].id);
      setLoading(false);
    });
  }, [id]);

  const currentSize = tablou?.sizes?.find(s => s.id === selectedSize);
  const price = tablou ? Math.round(tablou.base_price * (currentSize?.price_multiplier || 1)) : 0;

  const handleAddToCart = () => {
    if (!tablou || !currentSize) return;
    for (let i = 0; i < quantity; i++) {
      addItem({
        bookId: `tablou-${tablou.id}-${currentSize.size}`,
        name: `${tablou.title} (${SIZE_LABELS[currentSize.size] || currentSize.size} - ${currentSize.width_cm}x${currentSize.height_cm}cm)`,
        price,
        image: tablou.image_url,
        category: "tablou",
        referenceCode: null,
      });
    }
    toast({ title: "تمت الإضافة إلى السلة ✅" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <div className="container mx-auto px-4 py-10">
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-32 w-full" /></div>
          </div>
        </div>
      </div>
    );
  }

  if (!tablou) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          <Frame className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold">لم يتم العثور على هذا التابلو</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Image */}
          <div className="rounded-xl overflow-hidden border border-border bg-muted/5">
            <img src={tablou.image_url} alt={tablou.title} className="w-full aspect-square object-cover" />
          </div>

          {/* Info */}
          <div className="space-y-5">
            <div>
              <Badge className="mb-2 bg-primary/10 text-primary border-primary/20">
                {TABLOU_CATEGORIES.find(c => c.value === tablou.category)?.label || tablou.category}
              </Badge>
              <h1 className="text-3xl font-bold text-foreground">{tablou.title}</h1>
              {tablou.description && <p className="text-muted-foreground mt-2">{tablou.description}</p>}
            </div>

            {/* Size selection */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">الحجم</p>
              <div className="grid grid-cols-3 gap-2">
                {tablou.sizes?.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSize(s.id)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedSize === s.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:border-primary/40"
                    }`}
                  >
                    <p className="font-bold text-sm">{SIZE_LABELS[s.size] || s.size}</p>
                    <p className="text-[11px] text-muted-foreground">{s.width_cm}×{s.height_cm} cm</p>
                    <p className="text-sm font-bold mt-1 text-primary">
                      {Math.round(tablou.base_price * s.price_multiplier)} د.م
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">الكمية</p>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-lg font-bold w-8 text-center">{quantity}</span>
                <Button variant="outline" size="icon" onClick={() => setQuantity(q => q + 1)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Price + CTA */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground">المجموع</span>
                <span className="text-2xl font-bold text-primary">{price * quantity} <span className="text-sm">د.م</span></span>
              </div>
              <Button onClick={handleAddToCart} className="w-full gap-2" size="lg">
                <ShoppingCart className="w-4 h-4" />
                أضف إلى السلة
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TablouDetail;
