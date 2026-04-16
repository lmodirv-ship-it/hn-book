import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, ShoppingCart, Crown, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { accessService } from "@/services/accessService";
import { toast } from "sonner";

interface PaywallProps {
  bookId: string;
  bookName: string;
  price: number;
  isLoggedIn: boolean;
  onAccessGranted: () => void;
}

const SUBSCRIPTION_PRICES = {
  monthly: 49,
  yearly: 399,
};

const Paywall = ({ bookId, bookName, price, isLoggedIn, onAccessGranted }: PaywallProps) => {
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = useState(false);
  const [subscribing, setSubscribing] = useState<"monthly" | "yearly" | null>(null);

  const handlePurchase = async () => {
    if (!isLoggedIn) {
      navigate("/auth");
      return;
    }
    setPurchasing(true);
    const result = await accessService.purchaseBook(bookId, price);
    setPurchasing(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("تم الشراء بنجاح! يمكنك الآن قراءة الكتاب");
    onAccessGranted();
  };

  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    if (!isLoggedIn) {
      navigate("/auth");
      return;
    }
    setSubscribing(plan);
    const result = await accessService.subscribe(plan);
    setSubscribing(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("تم الاشتراك بنجاح! يمكنك الآن قراءة جميع الكتب");
    onAccessGranted();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/40 bg-gradient-to-b from-card to-card/80 p-6 space-y-6"
      dir="rtl"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">محتوى مدفوع</h3>
        <p className="text-sm text-muted-foreground">يجب الشراء أو الاشتراك لقراءة "{bookName}"</p>
      </div>

      {/* Option 1: Buy */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground text-sm">شراء هذا الكتاب</span>
          </div>
          <span className="text-lg font-bold text-primary">{price} د.م</span>
        </div>
        <p className="text-xs text-muted-foreground">وصول دائم لهذا الكتاب فقط</p>
        <Button
          onClick={handlePurchase}
          disabled={purchasing}
          className="w-full gap-2"
        >
          {!isLoggedIn ? (
            <><LogIn className="w-4 h-4" /> سجل الدخول للشراء</>
          ) : purchasing ? (
            "جارٍ الشراء..."
          ) : (
            <><ShoppingCart className="w-4 h-4" /> اشترِ الآن — {price} د.م</>
          )}
        </Button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">أو</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Option 2: Subscribe */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-500" />
          <span className="font-semibold text-foreground text-sm">اشتراك غير محدود</span>
          <Badge variant="secondary" className="text-[10px]">جميع الكتب</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleSubscribe("monthly")}
            disabled={subscribing !== null}
            className="rounded-xl border border-border/40 bg-card p-3 text-center hover:border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-50"
          >
            <p className="text-lg font-bold text-foreground">{SUBSCRIPTION_PRICES.monthly} د.م</p>
            <p className="text-xs text-muted-foreground">شهرياً</p>
            {subscribing === "monthly" && <p className="text-xs text-primary mt-1">جارٍ...</p>}
          </button>
          <button
            onClick={() => handleSubscribe("yearly")}
            disabled={subscribing !== null}
            className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center hover:bg-primary/10 transition-all relative disabled:opacity-50"
          >
            <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] bg-primary text-primary-foreground">وفر 32%</Badge>
            <p className="text-lg font-bold text-foreground">{SUBSCRIPTION_PRICES.yearly} د.م</p>
            <p className="text-xs text-muted-foreground">سنوياً</p>
            {subscribing === "yearly" && <p className="text-xs text-primary mt-1">جارٍ...</p>}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Paywall;
