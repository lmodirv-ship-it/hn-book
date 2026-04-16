import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Crown, Users, TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { accessService } from "@/services/accessService";

const SalesManagement = () => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, sRes] = await Promise.all([
      accessService.getAllPurchases(),
      accessService.getAllSubscriptions(),
    ]);
    if (pRes.data) setPurchases(pRes.data);
    if (sRes.data) setSubscriptions(sRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const totalRevenue = purchases.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const activeSubs = subscriptions.filter(s => s.status === "active").length;

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">💰 المبيعات والاشتراكات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">إدارة المشتريات والاشتراكات</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={fetchData}>
          <RefreshCw className="w-3.5 h-3.5" /> تحديث
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: ShoppingCart, label: "إجمالي المشتريات", value: purchases.length, color: "text-primary" },
          { icon: TrendingUp, label: "إجمالي الإيرادات", value: `${totalRevenue} د.م`, color: "text-green-500" },
          { icon: Crown, label: "اشتراكات نشطة", value: activeSubs, color: "text-yellow-500" },
          { icon: Users, label: "إجمالي الاشتراكات", value: subscriptions.length, color: "text-blue-500" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Purchases Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" /> المشتريات ({purchases.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">الكتاب</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">المبلغ</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">المستخدم</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                  </tr>
                ))
              ) : purchases.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">لا توجد مشتريات بعد</td></tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {p.products?.image && (
                          <img src={p.products.image} alt="" className="w-8 h-8 rounded object-cover" />
                        )}
                        <span className="font-medium text-foreground truncate max-w-[200px]">
                          {p.products?.name || p.book_id?.slice(0, 8)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">{Number(p.amount)} د.م</td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{p.user_id?.slice(0, 8)}...</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("ar-MA")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-500" /> الاشتراكات ({subscriptions.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">المستخدم</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">الخطة</th>
                <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">الحالة</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">ينتهي في</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-5 w-14 mx-auto" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                  </tr>
                ))
              ) : subscriptions.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">لا توجد اشتراكات بعد</td></tr>
              ) : (
                subscriptions.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{s.user_id?.slice(0, 8)}...</td>
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {s.plan === "monthly" ? "شهري" : s.plan === "yearly" ? "سنوي" : s.plan}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge className={`text-[10px] ${
                        s.status === "active" ? "bg-green-500/10 text-green-500" :
                        s.status === "expired" ? "bg-red-500/10 text-red-500" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {s.status === "active" ? "نشط" : s.status === "expired" ? "منتهي" : "ملغي"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {new Date(s.end_date).toLocaleDateString("ar-MA")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesManagement;
