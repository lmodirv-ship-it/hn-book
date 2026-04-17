/**
 * /billing — User dashboard for plans, credits balance, and purchase.
 * Stripe checkout is intentionally stubbed (toast) — wire it up when payments are enabled.
 */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Sparkles, Coins, ArrowRight, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useBilling } from "@/hooks/useBilling";
import { subscriptionService, type SubscriptionPlan, type CreditTransaction } from "@/services/subscriptionService";

const CREDIT_PACKS = [
  { credits: 20, price: 19, label: "20 نقطة" },
  { credits: 50, price: 39, label: "50 نقطة", popular: true },
  { credits: 200, price: 119, label: "200 نقطة" },
];

const BillingPage = () => {
  const billing = useBilling();
  const [params] = useSearchParams();
  const tab = params.get("tab") === "credits" ? "credits" : "plans";
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [history, setHistory] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, h] = await Promise.all([
          subscriptionService.listPlans(),
          subscriptionService.listMyTransactions(15),
        ]);
        setPlans(p);
        setHistory(h);
      } finally {
        setLoading(false);
      }
    })();
  }, [billing.credits?.balance]);

  const stub = () =>
    toast({
      title: "💳 الدفع قريباً",
      description: "سيتم تفعيل Stripe خلال الإطلاق التالي. تواصل مع الدعم للحصول على نقاط الآن.",
    });

  if (!billing.authed && !billing.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> سجّل دخول</CardTitle>
            <CardDescription>يجب تسجيل الدخول لعرض الاشتراك والنقاط.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/auth"><Button className="w-full">تسجيل الدخول</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container max-w-5xl py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">الاشتراك والنقاط</h1>
            <p className="text-sm text-muted-foreground mt-1">إدارة خطتك ورصيدك من النقاط لتصدير التصاميم.</p>
          </div>
          <Link to="/studio"><Button variant="ghost" size="sm" className="gap-1"><ArrowRight className="w-4 h-4" /> الاستوديو</Button></Link>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="w-4 h-4 text-primary" /> خطتك الحالية</CardTitle>
            </CardHeader>
            <CardContent>
              {billing.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{billing.plan?.name ?? "Free"}</div>
                    <div className="text-xs text-muted-foreground">
                      {billing.plan?.is_unlimited ? "تصدير غير محدود" : `${billing.plan?.monthly_credits ?? 0} نقطة شهرياً`}
                    </div>
                  </div>
                  {billing.plan?.is_unlimited && <Badge>Unlimited</Badge>}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><Coins className="w-4 h-4 text-amber-500" /> رصيدك من النقاط</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{billing.credits?.balance ?? 0}</div>
              <div className="text-xs text-muted-foreground">
                إجمالي مكتسب {billing.credits?.total_earned ?? 0} • مستهلك {billing.credits?.total_spent ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue={tab}>
          <TabsList>
            <TabsTrigger value="plans">الخطط</TabsTrigger>
            <TabsTrigger value="credits">النقاط</TabsTrigger>
            <TabsTrigger value="history">السجل</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-3">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((p) => {
                  const current = billing.plan?.code === p.code;
                  return (
                    <Card key={p.id} className={current ? "border-primary" : ""}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between text-lg">
                          {p.name}
                          {current && <Badge variant="secondary">الحالي</Badge>}
                        </CardTitle>
                        <CardDescription>
                          <span className="text-2xl font-bold text-foreground">${p.price_monthly}</span>
                          <span className="text-xs text-muted-foreground"> /شهر</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <ul className="space-y-1.5 text-sm">
                          {p.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {f}
                            </li>
                          ))}
                        </ul>
                        <Button className="w-full" disabled={current} onClick={stub}>
                          {current ? "خطتك الحالية" : `ترقية إلى ${p.name}`}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="credits">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CREDIT_PACKS.map((pack) => (
                <Card key={pack.credits} className={pack.popular ? "border-primary" : ""}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {pack.label}
                      {pack.popular && <Badge>الأكثر طلباً</Badge>}
                    </CardTitle>
                    <CardDescription className="text-2xl font-bold text-foreground">${pack.price}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full gap-1.5" onClick={stub}>
                      <Coins className="w-4 h-4" /> شراء
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="p-0">
                {history.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground text-center">لا توجد عمليات بعد.</div>
                ) : (
                  <ul className="divide-y divide-border">
                    {history.map((h) => (
                      <li key={h.id} className="flex items-center justify-between p-3 text-sm">
                        <div>
                          <div className="font-medium">{h.reason}</div>
                          <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("ar")}</div>
                        </div>
                        <Badge variant={h.delta >= 0 ? "default" : "destructive"}>
                          {h.delta >= 0 ? "+" : ""}{h.delta}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BillingPage;
